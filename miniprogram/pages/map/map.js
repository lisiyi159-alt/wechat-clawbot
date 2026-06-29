const app = getApp();

Page({
  data: {
    markers: [],
    longitude: 116.4, // 默认北京
    latitude: 39.9,
    scale: 4,
    hasPoints: false,
    loading: true,
  },

  onShow() {
    this.load();
  },

  load() {
    app
      .ensureLogin()
      .then(() => wx.cloud.callFunction({ name: 'trips', data: { action: 'list' } }))
      .then((res) => {
        if (!res || !res.result || !res.result.ok) return;
        const trips = res.result.data.filter(
          (t) => t.latitude != null && t.longitude != null
        );
        this._trips = trips;
        const markers = trips.map((t, i) => ({
          id: i,
          latitude: t.latitude,
          longitude: t.longitude,
          width: 30,
          height: 30,
          callout: {
            content: t.location ? `${t.title} · ${t.location}` : t.title,
            display: 'BYCLICK',
            padding: 8,
            borderRadius: 8,
            fontSize: 13,
            color: '#1f2937',
            bgColor: '#ffffff',
          },
        }));
        const center = markers.length ? markers[0] : null;
        this.setData({
          markers,
          hasPoints: markers.length > 0,
          loading: false,
          ...(center
            ? { latitude: center.latitude, longitude: center.longitude }
            : {}),
        });
      })
      .catch(() => this.setData({ loading: false }));
  },

  tapMarker(e) {
    const trip = this._trips && this._trips[e.markerId];
    if (trip) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${trip._id}` });
    }
  },
});
