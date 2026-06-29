const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getMember(openid) {
  const res = await db.collection('members').where({ openid }).get();
  return res.data.length ? res.data[0] : { role: 'member', name: '' };
}

// 封面取第一条有照片的记录的首图
function computeCover(entries) {
  for (const e of entries || []) {
    if (e.photos && e.photos.length) return e.photos[0];
  }
  return '';
}

// 把云文件 ID 批量换成临时 https 链接。
// 云函数内是管理员权限，即使存储权限是「仅创建者可读写」，
// 也能为所有家人生成可访问的图片链接（无需付费改权限）。
async function attachUrls(list) {
  // 默认先用原始 fileID 兜底，保证即使取链接失败也不影响列表返回
  list.forEach((t) => {
    t.coverUrl = t.cover || '';
    (t.entries || []).forEach((e) => {
      e.photoUrls = e.photos || [];
    });
  });

  try {
    const ids = [];
    list.forEach((t) => {
      if (t.cover) ids.push(t.cover);
      (t.entries || []).forEach((e) =>
        (e.photos || []).forEach((p) => ids.push(p))
      );
    });
    const uniq = [...new Set(ids)].filter(
      (x) => typeof x === 'string' && x.indexOf('cloud://') === 0
    );

    const map = {};
    // getTempFileURL 单次最多 50 个，分批处理
    for (let i = 0; i < uniq.length; i += 50) {
      const batch = uniq.slice(i, i + 50);
      const r = await cloud.getTempFileURL({ fileList: batch });
      (r.fileList || []).forEach((f) => {
        if (f.tempFileURL) map[f.fileID] = f.tempFileURL;
      });
    }

    list.forEach((t) => {
      if (t.cover && map[t.cover]) t.coverUrl = map[t.cover];
      (t.entries || []).forEach((e) => {
        e.photoUrls = (e.photos || []).map((p) => map[p] || p);
      });
    });
  } catch (err) {
    // 取临时链接失败时，保留上面的 fileID 兜底，列表照常返回
    console.error('attachUrls failed', err);
  }
  return list;
}

// 一段旅行可由多位家人接力记录：
//   trip.entries = [{ openid, name, text, photos[], createdAt }]
//   第一条是创建者的主记录，后续为他人的「补充」
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const me = await getMember(OPENID);
  const trips = db.collection('trips');
  const { action } = event;

  if (action === 'list') {
    const res = await trips
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    await attachUrls(res.data);
    return { ok: true, data: res.data };
  }

  if (action === 'get') {
    const res = await trips.doc(event.id).get();
    await attachUrls([res.data]);
    return { ok: true, data: res.data };
  }

  // 新建旅行（任何家人都可以）
  if (action === 'create') {
    const entry = {
      openid: OPENID,
      name: me.name || '家人',
      text: (event.text || '').trim(),
      photos: Array.isArray(event.photos) ? event.photos : [],
      createdAt: new Date(),
    };
    const doc = {
      openid: OPENID,
      title: (event.title || '未命名旅行').trim(),
      location: event.location || '',
      latitude: event.latitude != null ? event.latitude : null,
      longitude: event.longitude != null ? event.longitude : null,
      date: event.date || '',
      hotel: event.hotel || '',
      transport: event.transport || '',
      transportOther: event.transportOther || '',
      entries: [entry],
      cover: computeCover([entry]),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };
    const res = await trips.add({ data: doc });
    return { ok: true, id: res._id };
  }

  // 编辑旅行信息 + 自己的主记录（创建者或管理员）
  if (action === 'update') {
    const snap = await trips.doc(event.id).get();
    const trip = snap.data;
    if (trip.openid !== OPENID && me.role !== 'admin') {
      return { ok: false, msg: '只能编辑自己创建的旅行' };
    }
    const entries = trip.entries || [];
    if (entries.length && entries[0].openid === OPENID) {
      if (typeof event.text === 'string') entries[0].text = event.text.trim();
      if (Array.isArray(event.photos)) entries[0].photos = event.photos;
    }
    await trips.doc(event.id).update({
      data: {
        title: (event.title || trip.title || '未命名旅行').trim(),
        location: event.location !== undefined ? event.location : trip.location,
        latitude: event.latitude !== undefined ? event.latitude : trip.latitude,
        longitude: event.longitude !== undefined ? event.longitude : trip.longitude,
        date: event.date !== undefined ? event.date : trip.date,
        hotel: event.hotel !== undefined ? event.hotel : trip.hotel,
        transport: event.transport !== undefined ? event.transport : trip.transport,
        transportOther:
          event.transportOther !== undefined
            ? event.transportOther
            : trip.transportOther,
        entries,
        cover: computeCover(entries),
        updatedAt: db.serverDate(),
      },
    });
    return { ok: true, id: event.id };
  }

  // 补充记录（任何家人）
  if (action === 'addEntry') {
    const snap = await trips.doc(event.id).get();
    const trip = snap.data;
    const entries = trip.entries || [];
    entries.push({
      openid: OPENID,
      name: me.name || '家人',
      text: (event.text || '').trim(),
      photos: Array.isArray(event.photos) ? event.photos : [],
      createdAt: new Date(),
    });
    await trips.doc(event.id).update({
      data: {
        entries,
        cover: trip.cover || computeCover(entries),
        updatedAt: db.serverDate(),
      },
    });
    return { ok: true };
  }

  // 编辑自己的某条记录
  if (action === 'editEntry') {
    const snap = await trips.doc(event.id).get();
    const entries = snap.data.entries || [];
    const i = event.index;
    if (!entries[i] || (entries[i].openid !== OPENID && me.role !== 'admin')) {
      return { ok: false, msg: '只能编辑自己的记录' };
    }
    if (typeof event.text === 'string') entries[i].text = event.text.trim();
    if (Array.isArray(event.photos)) entries[i].photos = event.photos;
    await trips.doc(event.id).update({
      data: { entries, cover: computeCover(entries), updatedAt: db.serverDate() },
    });
    return { ok: true };
  }

  // 删除自己的补充记录（首条主记录不可单独删，请删整段旅行）
  if (action === 'deleteEntry') {
    const snap = await trips.doc(event.id).get();
    const entries = snap.data.entries || [];
    const i = event.index;
    if (i === 0) return { ok: false, msg: '主记录不可单独删除' };
    if (!entries[i] || (entries[i].openid !== OPENID && me.role !== 'admin')) {
      return { ok: false, msg: '只能删除自己的记录' };
    }
    entries.splice(i, 1);
    await trips.doc(event.id).update({
      data: { entries, cover: computeCover(entries), updatedAt: db.serverDate() },
    });
    return { ok: true };
  }

  // 删除整段旅行：创建者或管理员
  if (action === 'delete') {
    const snap = await trips.doc(event.id).get();
    if (snap.data.openid !== OPENID && me.role !== 'admin') {
      return { ok: false, msg: '只能删除自己创建的旅行' };
    }
    await trips.doc(event.id).remove();
    return { ok: true };
  }

  return { ok: false, msg: '未知操作' };
};
