// 上传前自动压缩图片：优先限制宽度+画质，失败则退回仅画质，再失败用原图
async function compress(path) {
  try {
    const res = await wx.compressImage({
      src: path,
      quality: 70,
      compressedWidth: 1600,
    });
    return res.tempFilePath;
  } catch (e1) {
    try {
      const res = await wx.compressImage({ src: path, quality: 70 });
      return res.tempFilePath;
    } catch (e2) {
      return path; // 压缩不支持/失败就用原图，保证一定能上传
    }
  }
}

// 逐张压缩并上传到云存储，返回 fileID 列表
async function uploadImages(localPaths, openid) {
  const ids = [];
  for (const path of localPaths) {
    const p = await compress(path);
    const m = p.match(/\.(\w+)$/);
    const ext = m ? m[1] : 'jpg';
    const cloudPath = `trips/${openid || 'anon'}/${Date.now()}-${Math.floor(
      Math.random() * 1e6
    )}.${ext}`;
    const r = await wx.cloud.uploadFile({ cloudPath, filePath: p });
    ids.push(r.fileID);
  }
  return ids;
}

module.exports = { uploadImages };
