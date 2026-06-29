const app = getApp();
const { checkBackupReminder } = require('../../utils/backup.js');

Page({
  data: {
    trips: [],
    loading: true,
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
          this.setData({ trips: res.result.data });
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
