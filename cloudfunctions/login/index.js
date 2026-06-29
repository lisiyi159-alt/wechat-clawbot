const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 访问控制交给「微信小程序白名单（体验成员）」——能打开的就是受信任的家人。
// 这里只区分谁能发布：
//   admin  —— 第一个进入小程序的人（你），可发布/编辑/删除
//   member —— 其余家人，自动加入，可查看 / 导出
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const members = db.collection('members');

  const mine = await members.where({ openid: OPENID }).get();
  if (mine.data.length > 0) {
    return { openid: OPENID, role: mine.data[0].role || 'member' };
  }

  // 第一个进入的人成为管理员，其余自动登记为家庭成员
  const total = await members.count();
  const role = total.total === 0 ? 'admin' : 'member';
  await members.add({
    data: { openid: OPENID, role, createdAt: db.serverDate() },
  });
  return { openid: OPENID, role };
};
