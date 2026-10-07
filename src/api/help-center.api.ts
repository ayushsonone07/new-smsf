import { delay, helpArticles } from './mock/db'
import type { HelpArticle } from '../features/departments/types/help-center.types'

export async function getHelpArticles(
  departmentId: string,
): Promise<HelpArticle[]> {
  await delay()

  return structuredClone(
    helpArticles.filter(
      (article) =>
        article.departmentId === departmentId,
    ),
  )
}
