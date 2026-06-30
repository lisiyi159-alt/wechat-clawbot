const app = getApp();

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
    app
      .ensureLogin()
      .then(() =>
        wx.cloud.callFunction({ name: 'trips', data: { action: 'list' } })
      )
      .then((res) => {
        if (res && res.result && res.result.ok) {
          // 列表已按日期倒序：上=近，下=远
          this.setData({ trips: res.result.data });
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
});
