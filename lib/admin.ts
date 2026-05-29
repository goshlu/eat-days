// ============================================================
// 管理员权限检查
// 通过环境变量 ADMIN_USER_IDS 配置管理员用户 ID
// ============================================================

// 获取管理员用户 ID 列表
export function getAdminUserIds(): string[] {
  const ids = process.env.ADMIN_USER_IDS || '';
  return ids.split(',').map(id => id.trim()).filter(Boolean);
}

// 检查用户是否为管理员
export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  const adminIds = getAdminUserIds();
  return adminIds.includes(userId);
}
