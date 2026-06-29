const app = getApp();

Page({
  data: {
    code: '',
    submitting: false,
  },

  onInput(e) {
    this.setData({ code: e.detail.value });
  },

  submit() {
    const code = this.data.code.trim();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    wx.cloud
      .callFunction({ name: 'redeem', data: { code } })
      .then((res) => {
        if (res.result.ok) {
          app.globalData.role = res.result.role || 'member';
          app.resetLogin(); // 让首页重新拉取角色
          wx.showToast({ title: '欢迎加入 🎉' });
          setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 700);
        } else {
          wx.showToast({ title: res.result.msg || '邀请码不正确', icon: 'none' });
        }
      })
      .catch(() => wx.showToast({ title: '出错了，请重试', icon: 'none' }))
      .then(() => this.setData({ submitting: false }));
  },
});
