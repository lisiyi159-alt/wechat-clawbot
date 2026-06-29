const app = getApp();
const { markBackupDone } = require('../../utils/backup.js');

Page({
  data: {
    trip: null,
    loading: true,
    isAdmin: false,
    shareImage: '', // 转发卡片用的封面图（https 临时链接）
  },

  onLoad(options) {
    this.id = options.id;
    app
      .ensureLogin()
      .then(({ role }) => {
        this.setData({ isAdmin: role === 'admin' });
        return wx.cloud.callFunction({
          name: 'trips',
          data: { action: 'get', id: this.id },
        });
      })
      .then((res) => {
        if (res && res.result && res.result.ok) {
          const trip = res.result.data;
          this.setData({ trip });
          wx.setNavigationBarTitle({ title: trip.title || '旅行' });
          // 把封面云文件 ID 换成 https 临时链接，供转发卡片使用
          if (trip.cover) {
            wx.cloud
              .getTempFileURL({ fileList: [trip.cover] })
              .then((r) => {
                const url = r.fileList && r.fileList[0] && r.fileList[0].tempFileURL;
                if (url) this.setData({ shareImage: url });
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => wx.showToast({ title: '加载失败', icon: 'none' }))
      .then(() => this.setData({ loading: false }));
  },

  // 转发这段旅行给家人，卡片带封面图和标题
  onShareAppMessage() {
    const t = this.data.trip || {};
    return {
      title: t.title || '我们的旅行手账',
      path: `/pages/detail/detail?id=${this.id}`,
      imageUrl: this.data.shareImage || '',
    };
  },

  // 点击照片大图预览
  preview(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.trip.photos,
    });
  },

  edit() {
    wx.navigateTo({ url: `/pages/publish/publish?id=${this.id}` });
  },

  // ============ 一键导出留存 ============
  // 把照片保存到手机相册，并把文字复制到剪贴板
  async exportTrip() {
    const trip = this.data.trip;
    if (!trip) return;

    const text = [
      trip.title,
      trip.date ? `日期：${trip.date}` : '',
      trip.location ? `地点：${trip.location}` : '',
      '',
      trip.content || '',
    ]
      .filter((s) => s !== '')
      .join('\n');
    wx.setClipboardData({ data: text, success: () => {}, fail: () => {} });

    const photos = trip.photos || [];
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
    } catch (e) {
      wx.hideLoading();
      console.error(e);
      const denied = e.errMsg && e.errMsg.indexOf('auth') > -1;
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
});
