const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 访问控制交给「微信小程序白名单（体验成员）」——能打开的就是受信任的家人。
// 这里维护每个人的角色和称呼：
//   role: admin（第一个进入的人）/ member（其余家人）
//   name: 家庭中的称呼，如 妈妈、姥姥（用于在记录上标识身份）
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const members = db.collection('members');
  const mineRes = await members.where({ openid: OPENID }).get();
  const mine = mineRes.data[0];

  // 设置 / 修改称呼
  if (event && event.action === 'setName') {
    const name = (event.name || '').trim().slice(0, 12);
    if (mine) {
      await members.doc(mine._id).update({ data: { name } });
    } else {
      const total = await members.count();
      const role = total.total === 0 ? 'admin' : 'member';
      await members.add({
        data: { openid: OPENID, role, name, createdAt: db.serverDate() },
      });
    }
    return { ok: true, name };
  }

  // 默认：登录并自动登记
  if (mine) {
    return { openid: OPENID, role: mine.role || 'member', name: mine.name || '' };
  }
  const total = await members.count();
  const role = total.total === 0 ? 'admin' : 'member';
  await members.add({
    data: { openid: OPENID, role, name: '', createdAt: db.serverDate() },
  });
  return { openid: OPENID, role, name: '' };
};
