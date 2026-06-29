const app = getApp();
const { markBackupDone } = require('../../utils/backup.js');

Page({
  data: {
    trip: null,
    entries: [], // 带 mine / isFirst / index 标记，便于渲染
    loading: true,
    canEdit: false, // 是否可编辑这段旅行（创建者或管理员）
    shareImage: '', // 转发卡片封面（https 临时链接）
  },

  onShow() {
    // 从补充/编辑页返回时刷新
    if (this.id) this.fetch();
  },

  onLoad(options) {
    this.id = options.id;
    app
      .ensureLogin()
      .then(() => this.fetch())
      .then(() => this.setData({ loading: false }));
  },

  fetch() {
    return wx.cloud
      .callFunction({ name: 'trips', data: { action: 'get', id: this.id } })
      .then((res) => {
        if (!res || !res.result || !res.result.ok) return;
        const trip = res.result.data;
        const my = app.globalData.openid;
        const entries = (trip.entries || []).map((e, i) => ({
          ...e,
          mine: e.openid === my,
          isFirst: i === 0,
          index: i,
        }));
        this.setData({
          trip,
          entries,
          canEdit: trip.openid === my || app.globalData.role === 'admin',
        });
        wx.setNavigationBarTitle({ title: trip.title || '旅行' });

        if (trip.cover) {
          wx.cloud
            .getTempFileURL({ fileList: [trip.cover] })
            .then((r) => {
              const url =
                r.fileList && r.fileList[0] && r.fileList[0].tempFileURL;
              if (url) this.setData({ shareImage: url });
            })
            .catch(() => {});
        }
      })
      .catch(() => wx.showToast({ title: '加载失败', icon: 'none' }));
  },

  preview(e) {
    const { urls, src } = e.currentTarget.dataset;
    wx.previewImage({ current: src, urls });
  },

  // 编辑整段旅行（含自己的主记录）
  editTrip() {
    wx.navigateTo({ url: `/pages/publish/publish?id=${this.id}` });
  },

  // 我也补充
  addEntry() {
    wx.navigateTo({ url: `/pages/entry/entry?id=${this.id}` });
  },

  // 编辑自己的某条记录
  editEntry(e) {
    const i = e.currentTarget.dataset.index;
    wx.navigateTo({ url: `/pages/entry/entry?id=${this.id}&index=${i}` });
  },

  // 删除自己的补充记录
  deleteEntry(e) {
    const i = e.currentTarget.dataset.index;
    wx.showModal({
      title: '删除这条记录？',
      success: (r) => {
        if (!r.confirm) return;
        wx.cloud
          .callFunction({
            name: 'trips',
            data: { action: 'deleteEntry', id: this.id, index: i },
          })
          .then((res) => {
            if (res.result.ok) this.fetch();
            else wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
          });
      },
    });
  },

  // 删除整段旅行（创建者 / 管理员）
  deleteTrip() {
    wx.showModal({
      title: '删除整段旅行？',
      content: '照片和所有人的记录都会一起删除，且不可恢复。',
      success: (r) => {
        if (!r.confirm) return;
        wx.cloud
          .callFunction({
            name: 'trips',
            data: { action: 'delete', id: this.id },
          })
          .then((res) => {
            if (res.result.ok) {
              wx.showToast({ title: '已删除' });
              setTimeout(() => wx.navigateBack(), 600);
            } else {
              wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
            }
          });
      },
    });
  },

  // ============ 一键导出留存 ============
  async exportTrip() {
    const trip = this.data.trip;
    if (!trip) return;

    const lines = [
      trip.title,
      trip.date ? `日期：${trip.date}` : '',
      trip.location ? `地点：${trip.location}` : '',
      '',
    ];
    const photos = [];
    (trip.entries || []).forEach((e, i) => {
      lines.push(`${e.name}${i === 0 ? '：' : '补充：'}${e.text || ''}`);
      (e.photos || []).forEach((p) => photos.push(p));
    });
    wx.setClipboardData({
      data: lines.filter((s) => s !== '').join('\n'),
      success: () => {},
      fail: () => {},
    });

    if (photos.length === 0) {
      wx.showModal({
        title: '已复制文字',
        content: '本次旅行没有照片，文字已复制到剪贴板，可粘贴到备忘录保存。',
        showCancel: false,
      });
      markBackupDone();
      return;
    }

    wx.showLoading({ title: `导出中 0/${photos.length}`, mask: true });
    let saved = 0;
    try {
      for (let i = 0; i < photos.length; i++) {
        const dl = await wx.cloud.downloadFile({ fileID: photos[i] });
        await wx.saveImageToPhotosAlbum({ filePath: dl.tempFilePath });
        saved++;
        wx.showLoading({ title: `导出中 ${saved}/${photos.length}`, mask: true });
      }
      wx.hideLoading();
      markBackupDone();
      wx.showModal({
        title: '导出完成 ✅',
        content: `已保存 ${saved} 张照片到手机相册，文字也已复制到剪贴板，可粘贴到备忘录长期保存。`,
        showCancel: false,
      });
    } catch (err) {
      wx.hideLoading();
      console.error(err);
      const denied = err.errMsg && err.errMsg.indexOf('auth') > -1;
      if (denied) {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置里允许「保存到相册」后重试。',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm) wx.openSetting();
          },
        });
      } else {
        wx.showToast({ title: '导出中断，请重试', icon: 'none' });
      }
    }
  },

  // 转发给家人
  onShareAppMessage() {
    const t = this.data.trip || {};
    return {
      title: t.title || '我们的旅行手账',
      path: `/pages/detail/detail?id=${this.id}`,
      imageUrl: this.data.shareImage || '',
    };
  },
});
