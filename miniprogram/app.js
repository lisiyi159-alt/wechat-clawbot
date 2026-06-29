const { ENV_ID } = require('./config.js');

App({
  globalData: {
    openid: '',
    role: 'member', // member（家人，可看可写）| admin（你，额外可删别人的）
    name: '', // 在家庭中的称呼，如 妈妈、姥姥
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

  // 登录并获取角色与称呼，结果缓存，返回 Promise<{openid, role, name}>
  ensureLogin() {
    if (this._loginPromise) return this._loginPromise;
    this._loginPromise = wx.cloud
      .callFunction({ name: 'login' })
      .then((res) => {
        const { openid, role, name } = res.result;
        this.globalData.openid = openid;
        this.globalData.role = role;
        this.globalData.name = name || '';
        return res.result;
      })
      .catch((err) => {
        this._loginPromise = null;
        throw err;
      });
    return this._loginPromise;
  },

  // 确保已设置称呼，没有就弹窗让用户输入。返回 Promise<name>
  ensureName() {
    if (this.globalData.name) return Promise.resolve(this.globalData.name);
    return new Promise((resolve) => {
      wx.showModal({
        title: '设置你的称呼',
        content: '记录会带上你的身份，例如「妈妈：今天去了…」',
        editable: true,
        placeholderText: '如 妈妈、姥姥',
        success: (r) => {
          const name = r.confirm && (r.content || '').trim();
          if (name) {
            wx.cloud
              .callFunction({ name: 'login', data: { action: 'setName', name } })
              .then(() => {
                this.globalData.name = name;
                resolve(name);
              })
              .catch(() => resolve(''));
          } else {
            resolve('');
          }
        },
        fail: () => resolve(''),
      });
    });
  },
});
