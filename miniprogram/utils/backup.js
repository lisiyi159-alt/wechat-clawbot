// 每三个月提醒一次导出备份

const REMINDER_KEY = 'lastBackupReminderAt';
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

// 在首页加载完成、且当前用户有访问权限时调用
function checkBackupReminder() {
  const now = Date.now();
  const last = wx.getStorageSync(REMINDER_KEY);

  // 首次使用：先记录时间，不立刻打扰
  if (!last) {
    wx.setStorageSync(REMINDER_KEY, now);
    return;
  }

  if (now - last >= NINETY_DAYS) {
    wx.showModal({
      title: '别忘了备份 🧳',
      content:
        '距上次提醒已经三个月啦。建议打开任意一段旅行，点「导出留存」把照片和文字保存到手机，更安心。',
      confirmText: '知道了',
      showCancel: false,
    });
    wx.setStorageSync(REMINDER_KEY, now);
  }
}

// 记录一次成功导出（导出页调用，便于以后做"已备份"提示）
function markBackupDone() {
  wx.setStorageSync('lastBackupAt', Date.now());
}

module.exports = { checkBackupReminder, markBackupDone };
