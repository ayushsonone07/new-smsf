import { Icon } from '../shared/Icon'
import { Avatar } from '../shared/Avatar'
import { SegmentedControl } from '../shared/SegmentedControl'
import type {
  HeadAccount,
  HeadNavItem,
  HeadRole,
} from '../../../features/departments/head/types/head.types'

interface HeadSidebarProps {
  open: boolean
  onToggle: () => void
  roleLabel: string
  items: HeadNavItem[]
  /** Second group shown under a "Customer-facing" heading (user role). */
  secondaryItems?: HeadNavItem[]
  activeKey: string
  onSelect: (item: HeadNavItem) => void
  account: HeadAccount
  role?: HeadRole
  onRoleChange?: (role: HeadRole) => void
  onLogout: () => void
}

/**
 * Collapsible white sidebar: brand, nav, account card
 * with Head/User switch and logout.
 */
export function HeadSidebar({
  open,
  onToggle,
  roleLabel,
  items,
  secondaryItems = [],
  activeKey,
  onSelect,
  account,
  role,
  onRoleChange,
  onLogout,
}: HeadSidebarProps) {
  function renderItem(item: HeadNavItem) {
    const on = item.key === activeKey

    return (
      <button
        key={item.key}
        type="button"
        className={`hnav__item${on ? ' is-on' : ''}`}
        aria-current={on ? 'page' : undefined}
        title={item.label}
        onClick={() => onSelect(item)}
      >
        <span className="hnav__bar" />
        <Icon name={item.icon} />
        {open ? <span className="hnav__label">{item.label}</span> : null}
      </button>
    )
  }

  return (
    <aside className={`hside${open ? '' : ' is-collapsed'}`}>
      <div className="hbrand">
        {open ? (
          <>
            <div className="hbrand__mark">
              <span>
                M<b>B</b>G
              </span>
            </div>

            <div className="hbrand__text">
              <strong>MBG Card</strong>
              <span>{roleLabel}</span>
            </div>
          </>
        ) : null}

        <button
          type="button"
          className="hbrand__toggle"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={onToggle}
        >
          <Icon name="menu" />
        </button>
      </div>

      <nav className="hnav" aria-label="Main">
        {items.map(renderItem)}

        {secondaryItems.length > 0 ? (
          <>
            {open ? (
              <div className="hnav__group">Customer-facing</div>
            ) : null}
            {secondaryItems.map(renderItem)}
          </>
        ) : null}
      </nav>

      {open ? (
        <div className="haccount">
          <div className="haccount__row">
            <Avatar
              name={account.initial ?? account.label}
              size={30}
              tone="brand"
            />

            <div className="haccount__text">
              <div className="haccount__name">{account.label}</div>
              <div className="haccount__role">{account.roleLabel}</div>
            </div>
          </div>

          {role && onRoleChange ? (
            <SegmentedControl
              fill
              size="sm"
              ariaLabel="Preview role"
              className="haccount__switch"
              value={role}
              onChange={onRoleChange}
              options={[
                { value: 'HEAD', label: 'Head' },
                { value: 'USER', label: 'User' },
              ]}
            />
          ) : null}

          <button
            type="button"
            className="haccount__logout"
            onClick={onLogout}
          >
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      ) : null}
    </aside>
  )
}
