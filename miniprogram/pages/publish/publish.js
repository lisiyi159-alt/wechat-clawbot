const app = getApp();
const { uploadImages } = require('../../utils/upload.js');

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
    latitude: null,
    longitude: null,
    date: today(),
    text: '',
    photos: [], // 已在云端的 fileID
    localPhotos: [], // 待上传的本地路径
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
            const entries = t.entries || [];
            // 取自己的主记录（创建者就是 entries[0]）
            const mine =
              entries.find((e) => e.openid === app.globalData.openid) ||
              entries[0] ||
              {};
            this.setData({
              title: t.title || '',
              location: t.location || '',
              latitude: t.latitude != null ? t.latitude : null,
              longitude: t.longitude != null ? t.longitude : null,
              date: t.date || today(),
              text: mine.text || '',
              photos: mine.photos || [],
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

  // 地图选点（带经纬度，足迹页才能标在地图上）
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: res.name || res.address || this.data.location,
          latitude: res.latitude,
          longitude: res.longitude,
        });
      },
      fail: () => {
        // 用户取消或无接口权限时，可继续手填地点名（只是不上地图）
      },
    });
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

  async submit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '先写个标题吧', icon: 'none' });
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
      const payload = {
        title: this.data.title,
        location: this.data.location,
        latitude: this.data.latitude,
        longitude: this.data.longitude,
        date: this.data.date,
        text: this.data.text,
        photos,
      };
      const data = this.data.id
        ? { action: 'update', id: this.data.id, ...payload }
        : { action: 'create', ...payload };
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
