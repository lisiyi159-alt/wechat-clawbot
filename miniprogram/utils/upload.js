// 逐张把本地图片上传到云存储，返回 fileID 列表
async function uploadImages(localPaths, openid) {
  const ids = [];
  for (const path of localPaths) {
    const m = path.match(/\.(\w+)$/);
    const ext = m ? m[1] : 'jpg';
    const cloudPath = `trips/${openid || 'anon'}/${Date.now()}-${Math.floor(
      Math.random() * 1e6
    )}.${ext}`;
    const r = await wx.cloud.uploadFile({ cloudPath, filePath: path });
    ids.push(r.fileID);
  }
  return ids;
}

module.exports = { uploadImages };
