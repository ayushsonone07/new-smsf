import type { HelpArticle } from '../../features/departments/types/help-center.types'

interface HelpArticleCardProps {
  article: HelpArticle
}

export function HelpArticleCard({
  article,
}: HelpArticleCardProps) {
  return (
    <article className="article-card">
      <span className="article-category">
        {article.category}
      </span>

      <h3>{article.title}</h3>

      <p>{article.excerpt}</p>

      <span className="article-updated">
        Updated{' '}
        {new Date(
          article.updatedAt,
        ).toLocaleDateString()}
      </span>
    </article>
  )
}
