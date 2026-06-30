const app = getApp();
const { uploadImages } = require('../../utils/upload.js');

Page({
  data: {
    tripId: '',
    index: null, // null = 新增补充；数字 = 编辑该条记录
    text: '',
    photos: [],
    localPhotos: [],
    submitting: false,
  },

  onLoad(options) {
    const index = options.index !== undefined ? Number(options.index) : null;
    this.setData({ tripId: options.id, index });
    if (index !== null) {
      wx.setNavigationBarTitle({ title: '编辑记录' });
      wx.cloud
        .callFunction({ name: 'trips', data: { action: 'get', id: options.id } })
        .then((res) => {
          if (res.result.ok) {
            const e = (res.result.data.entries || [])[index] || {};
            this.setData({ text: e.text || '', photos: e.photos || [] });
          }
        });
    } else {
      wx.setNavigationBarTitle({ title: '我也补充' });
    }
  },

  onInput(e) {
    this.setData({ text: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 20,
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

  async submit() {
    const hasContent =
      this.data.text.trim() ||
      this.data.photos.length ||
      this.data.localPhotos.length;
    if (!hasContent) {
      wx.showToast({ title: '写点什么或加张照片吧', icon: 'none' });
      return;
    }
    const name = await app.ensureName();
    if (!name) {
      wx.showToast({ title: '请先设置你的称呼', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中…', mask: true });
    try {
      const newIds = await uploadImages(this.data.localPhotos, app.globalData.openid);
      const photos = this.data.photos.concat(newIds);
      const data =
        this.data.index === null
          ? { action: 'addEntry', id: this.data.tripId, text: this.data.text, photos }
          : {
              action: 'editEntry',
              id: this.data.tripId,
              index: this.data.index,
              text: this.data.text,
              photos,
            };
      const res = await wx.cloud.callFunction({ name: 'trips', data });
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
