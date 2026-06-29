const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function getRole(openid) {
  const res = await db.collection('members').where({ openid }).get();
  return res.data.length ? res.data[0].role || 'member' : 'guest';
}

// 统一处理旅行记录的读写，所有访问都先校验权限（白名单逻辑收在服务端）
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const role = await getRole(OPENID);

  if (role === 'guest') {
    return { ok: false, code: 'NO_ACCESS', msg: '你还没有访问权限' };
  }

  const trips = db.collection('trips');
  const { action } = event;

  // 列表：家人和管理员都可看
  if (action === 'list') {
    const res = await trips
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return { ok: true, data: res.data };
  }

  // 详情
  if (action === 'get') {
    const res = await trips.doc(event.id).get();
    return { ok: true, data: res.data };
  }

  // 新增 / 编辑：默认仅管理员可发布
  // 想让家人也能发布游记？把下面这行的 role !== 'admin' 改成 false 即可。
  if (action === 'save') {
    if (role !== 'admin') {
      return { ok: false, code: 'FORBIDDEN', msg: '只有管理员可以发布' };
    }
    const { id, title, location, date, content, photos, cover } = event;
    const doc = {
      title: (title || '未命名旅行').trim(),
      location: location || '',
      date: date || '',
      content: content || '',
      photos: Array.isArray(photos) ? photos : [],
      cover: cover || (Array.isArray(photos) && photos[0]) || '',
      updatedAt: db.serverDate(),
    };
    if (id) {
      await trips.doc(id).update({ data: doc });
      return { ok: true, id };
    }
    const res = await trips.add({
      data: { ...doc, openid: OPENID, createdAt: db.serverDate() },
    });
    return { ok: true, id: res._id };
  }

  // 删除：仅管理员
  if (action === 'delete') {
    if (role !== 'admin') {
      return { ok: false, code: 'FORBIDDEN', msg: '只有管理员可以删除' };
    }
    await trips.doc(event.id).remove();
    return { ok: true };
  }

  return { ok: false, msg: '未知操作' };
};
