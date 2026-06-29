const app = getApp();

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

Page({
  data: {
    id: '',
    title: '',
    location: '',
    date: today(),
    content: '',
    photos: [], // 已在云端的 fileID（编辑时回填）
    localPhotos: [], // 本次新选、待上传的本地路径
    submitting: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      wx.setNavigationBarTitle({ title: '编辑旅行' });
      wx.cloud
        .callFunction({ name: 'trips', data: { action: 'get', id: options.id } })
        .then((res) => {
          if (res.result.ok) {
            const t = res.result.data;
            this.setData({
              title: t.title || '',
              location: t.location || '',
              date: t.date || today(),
              content: t.content || '',
              photos: t.photos || [],
            });
          }
        });
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map((f) => f.tempFilePath);
        this.setData({ localPhotos: this.data.localPhotos.concat(paths) });
      },
    });
  },

  removeLocal(e) {
    const arr = this.data.localPhotos.slice();
    arr.splice(e.currentTarget.dataset.index, 1);
    this.setData({ localPhotos: arr });
  },

  removeUploaded(e) {
    const arr = this.data.photos.slice();
    arr.splice(e.currentTarget.dataset.index, 1);
    this.setData({ photos: arr });
  },

  // 逐张上传本地图片到云存储，返回 fileID 列表
  async uploadAll() {
    const openid = app.globalData.openid || 'anon';
    const ids = [];
    for (const path of this.data.localPhotos) {
      const m = path.match(/\.(\w+)$/);
      const ext = m ? m[1] : 'jpg';
      const cloudPath = `trips/${openid}/${Date.now()}-${Math.floor(
        Math.random() * 1e6
      )}.${ext}`;
      const r = await wx.cloud.uploadFile({ cloudPath, filePath: path });
      ids.push(r.fileID);
    }
    return ids;
  },

  async submit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '先写个标题吧', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中…', mask: true });
    try {
      const newIds = await this.uploadAll();
      const photos = this.data.photos.concat(newIds);
      const res = await wx.cloud.callFunction({
        name: 'trips',
        data: {
          action: 'save',
          id: this.data.id || undefined,
          title: this.data.title,
          location: this.data.location,
          date: this.data.date,
          content: this.data.content,
          photos,
          cover: photos[0] || '',
        },
      });
      wx.hideLoading();
      if (res.result.ok) {
        wx.showToast({ title: '已保存' });
        setTimeout(() => wx.navigateBack(), 600);
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      console.error(e);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
