const { ENV_ID } = require('./config.js');

App({
  globalData: {
    openid: '',
    role: 'member', // member（家人，可看）| admin（你，可发布）
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库不支持云能力，请使用 2.2.3 或以上版本');
      return;
    }
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    });
  },

  // 登录并获取角色，结果缓存，返回 Promise<{openid, role}>
  ensureLogin() {
    if (this._loginPromise) return this._loginPromise;
    this._loginPromise = wx.cloud
      .callFunction({ name: 'login' })
      .then((res) => {
        const { openid, role } = res.result;
        this.globalData.openid = openid;
        this.globalData.role = role;
        return res.result;
      })
      .catch((err) => {
        this._loginPromise = null; // 失败后允许重试
        throw err;
      });
    return this._loginPromise;
  },
});
