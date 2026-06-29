const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ============ 需要你修改：家人邀请码 ============
// 把这段改成你自己的邀请码，发给信任的家人。
// 放在云函数里（而不是小程序前端），更不容易被看到。
const INVITE_CODE = 'family-2026';

// 家人输入邀请码 -> 校验通过后写入 members，获得查看权限
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const code = (event.code || '').trim();

  if (code !== INVITE_CODE) {
    return { ok: false, msg: '邀请码不正确' };
  }

  const members = db.collection('members');
  const exist = await members.where({ openid: OPENID }).get();
  if (exist.data.length === 0) {
    await members.add({
      data: { openid: OPENID, role: 'member', createdAt: db.serverDate() },
    });
    return { ok: true, role: 'member' };
  }

  return { ok: true, role: exist.data[0].role || 'member' };
};
