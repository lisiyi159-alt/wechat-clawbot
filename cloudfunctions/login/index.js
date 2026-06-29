const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 返回当前用户的 openid 和角色：
//   admin  —— 第一个进入小程序的人（你），可发布/编辑/删除
//   member —— 通过邀请码加入的家人，可查看
//   guest  —— 尚未获得权限，需输入邀请码
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const members = db.collection('members');

  const mine = await members.where({ openid: OPENID }).get();
  if (mine.data.length > 0) {
    return { openid: OPENID, role: mine.data[0].role || 'member' };
  }

  // 引导：如果一个成员都还没有，第一个进入的人自动成为管理员
  const total = await members.count();
  if (total.total === 0) {
    await members.add({
      data: { openid: OPENID, role: 'admin', createdAt: db.serverDate() },
    });
    return { openid: OPENID, role: 'admin' };
  }

  return { openid: OPENID, role: 'guest' };
};
