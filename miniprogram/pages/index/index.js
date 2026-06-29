const app = getApp();
const { checkBackupReminder, markBackupDone } = require('../../utils/backup.js');

Page({
  data: {
    trips: [],
    groups: [], // 按年份分组：[{ year, items: [] }]
    loading: true,
  },

  // 列表已按日期倒序，这里按年份切分成组
  buildGroups(trips) {
    const groups = [];
    trips.forEach((t) => {
      const year = (t.date || '').slice(0, 4) || '未标注日期';
      const last = groups[groups.length - 1];
      if (!last || last.year !== year) {
        groups.push({ year, items: [t] });
      } else {
        last.items.push(t);
      }
    });
    return groups;
  },

  onShow() {
    this.load();
  },

  onPullDownRefresh() {
    this.load(() => wx.stopPullDownRefresh());
  },

  load(done) {
    this.setData({ loading: true });
    app
      .ensureLogin()
      .then(() =>
        wx.cloud.callFunction({ name: 'trips', data: { action: 'list' } })
      )
      .then((res) => {
        if (res && res.result && res.result.ok) {
          const trips = res.result.data;
          this.setData({ trips, groups: this.buildGroups(trips) });
          // 列表正常显示后，检查是否该提醒备份
          checkBackupReminder();
        }
      })
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      })
      .then(() => {
        this.setData({ loading: false });
        done && done();
      });
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}`,
    });
  },

  goPublish() {
    wx.navigateTo({ url: '/pages/publish/publish' });
  },

  // 一键导出全部旅行：所有照片存相册，所有文字进剪贴板
  async exportAll() {
    const trips = this.data.trips;
    if (!trips.length) {
      wx.showToast({ title: '还没有旅行记录', icon: 'none' });
      return;
    }

    const photos = [];
    const blocks = [];
    trips.forEach((t) => {
      const lines = [`【${t.title}】`];
      if (t.date) lines.push(`日期：${t.date}`);
      if (t.location) lines.push(`地点：${t.location}`);
      if (t.hotel) lines.push(`住宿：${t.hotel}`);
      if (t.transport) {
        const tr = t.transport === '其他' ? t.transportOther || '' : t.transport;
        lines.push(`交通：${tr}`);
      }
      (t.entries || []).forEach((e, i) => {
        lines.push(`${e.name}${i === 0 ? '：' : '补充：'}${e.text || ''}`);
        (e.photos || []).forEach((p) => photos.push(p));
      });
      blocks.push(lines.join('\n'));
    });
    const allText = blocks.join('\n\n——————————\n\n');

    const confirm = await wx.showModal({
      title: '导出全部旅行',
      content: `将把 ${trips.length} 段旅行、共 ${photos.length} 张照片保存到相册，文字一起复制到剪贴板。照片多时请耐心等待。`,
      confirmText: '开始导出',
    });
    if (!confirm.confirm) return;

    wx.setClipboardData({ data: allText, success: () => {}, fail: () => {} });

    if (photos.length === 0) {
      wx.showModal({
        title: '已复制文字',
        content: '没有照片，全部文字已复制到剪贴板，可粘贴到备忘录保存。',
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
        content: `已保存 ${saved} 张照片到相册，全部文字已复制到剪贴板。`,
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

  // 转发给家人（聊天/群）
  onShareAppMessage() {
    const cover = this.data.trips.length ? this.data.trips[0].cover : '';
    return {
      title: '我们的家庭旅行手账',
      path: '/pages/index/index',
      imageUrl: cover || '',
    };
  },
});
