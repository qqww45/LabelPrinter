/**
 * 清除本机数据前导出备份（项目 JSON 自包含 dataSource.data）。
 */
export function buildLocalBackupSnapshot({ projects = [], currentId = '' } = {}) {
  return {
    v: 1,
    kind: 'labelprint-local-backup',
    exportedAt: new Date().toISOString(),
    currentId,
    list: projects.map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: p.updatedAt,
      data: p.data
    }))
  }
}
