import { useMemo, useState } from 'react'
import type { HelpArticle } from '../../features/departments/types/help-center.types'
import { HelpArticleCard } from './HelpArticleCard'
import { SearchInput } from '../ui/SearchInput'
import { Select } from '../ui/Select'
import { EmptyState } from '../ui/EmptyState'

interface HelpCenterProps {
  articles: HelpArticle[]
}

export function HelpCenter({
  articles,
}: HelpCenterProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')

  const categories = useMemo(
    () => [
      'ALL',
      ...Array.from(
        new Set(
          articles.map(
            (article) => article.category,
          ),
        ),
      ),
    ],
    [articles],
  )

  const filteredArticles = useMemo(() => {
    const value = search.trim().toLowerCase()

    return articles.filter((article) => {
      const matchesSearch =
        !value ||
        [
          article.title,
          article.category,
          article.excerpt,
        ]
          .join(' ')
          .toLowerCase()
          .includes(value)

      const matchesCategory =
        category === 'ALL' ||
        article.category === category

      return matchesSearch && matchesCategory
    })
  }, [articles, search, category])

  return (
    <>
      <div className="filter-row filter-row-split">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search articles, topics or keywords..."
          ariaLabel="Search help articles"
        />

        <Select
          className="permission-select"
          aria-label="Filter by category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value)
          }
        >
          {categories.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option === 'ALL'
                ? 'All categories'
                : option}
            </option>
          ))}
        </Select>
      </div>

      {filteredArticles.length === 0 ? (
        <EmptyState
          icon="?"
          title="No articles found"
          description="Try a different search or category."
        />
      ) : (
        <div className="article-grid">
          {filteredArticles.map((article) => (
            <HelpArticleCard
              key={article.id}
              article={article}
            />
          ))}
        </div>
      )}
    </>
  )
}
