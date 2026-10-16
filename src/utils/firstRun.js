/**
 * 第一次打开才挡在工作台前面讲「这是什么」。
 * 已经有标签、有表格，或本地不止一个项目，说明人已经在用了，不再打断。
 */
export function shouldOfferWelcome({ introDone, projectCount, componentCount, rowCount }) {
  if (introDone) return false
  if (Number(projectCount) > 1) return false
  if (Number(componentCount) > 0) return false
  if (Number(rowCount) > 0) return false
  return true
}
