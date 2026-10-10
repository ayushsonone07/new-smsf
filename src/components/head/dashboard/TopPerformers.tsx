import { Avatar } from '../shared/Avatar'

export interface TopPerformerItem {
  rank: 1 | 2 | 3
  name: string
  score: number
}

const DEFAULT_TOP_PERFORMERS: TopPerformerItem[] = [
  { rank: 1, name: 'Abhishek Sahu', score: 64 },
  { rank: 2, name: 'Mahima', score: 52 },
  { rank: 3, name: 'Mohit', score: 47 },
]

export interface TopPerformersProps {
  performers?: TopPerformerItem[]
}

/**
 * Top Performers leaderboard widget for the Head Dashboard.
 */
export function TopPerformers({
  performers = DEFAULT_TOP_PERFORMERS,
}: TopPerformersProps) {
  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <div className="hdb-card__title-group">
          <h3 className="hdb-card__title">Top Performers</h3>
          <span className="hdb-card__subtitle">Ranked by total updates</span>
        </div>
      </div>

      <div className="hdb-top-performers-list">
        {performers.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            No performers recorded for this period
          </div>
        ) : (
          performers.map((item) => (
          <div key={item.rank} className="hdb-top-performer-item">
            <div className="hdb-top-performer-left">
              <span className={`hdb-rank-badge hdb-rank-badge--${item.rank}`}>
                {item.rank}
              </span>
              <Avatar
                name={item.name}
                size={26}
                tone={item.rank === 1 ? 'brand' : 'soft'}
              />
              <span className="hdb-top-performer-name">{item.name}</span>
            </div>

            <span className="hdb-top-performer-score">{item.score}</span>
          </div>
        )))}
      </div>
    </div>
  )
}
