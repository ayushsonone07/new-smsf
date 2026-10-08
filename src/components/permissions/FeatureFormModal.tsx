import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '../head/shared/Icon'
import type { IconName } from '../head/shared/iconPaths'
import {
  ICON_OPTIONS,
  SCREEN_OPTIONS,
} from '../../features/permissions/config/screenOptions'
import type {
  CreateFeaturePermissionRequest,
  HeadScreenKey,
  PermissionLevel,
} from '../../features/permissions/types/permission.types'

interface FeatureFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  onClose: () => void
  onSubmit: (values: CreateFeaturePermissionRequest) => void
  initialValues?: Partial<CreateFeaturePermissionRequest>
  isSubmitting?: boolean
  error?: string
}

/** Admin: add / edit a head-panel feature (= sidebar item). */
export function FeatureFormModal({
  open,
  onClose,
  ...rest
}: FeatureFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rest.mode === 'create' ? 'Add feature' : 'Edit feature'}
      description="This appears as a menu item in the department head panel."
    >
      <FeatureForm onClose={onClose} {...rest} />
    </Modal>
  )
}

const EMPTY: CreateFeaturePermissionRequest = {
  name: '',
  description: '',
  screen: 'custom',
  slug: '',
  icon: 'brief',
  enabled: true,
  roleAPermission: 'CAN_READ',
  roleBPermission: 'CAN_READ',
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function FeatureForm({
  mode,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting = false,
  error,
}: Omit<FeatureFormModalProps, 'open'>) {
  const [values, setValues] = useState<CreateFeaturePermissionRequest>(() => ({
    ...EMPTY,
    ...initialValues,
  }))
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')

  function update<K extends keyof CreateFeaturePermissionRequest>(
    key: K,
    value: CreateFeaturePermissionRequest[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleScreenChange(screen: HeadScreenKey) {
    const option = SCREEN_OPTIONS.find((item) => item.value === screen)
    setValues((current) => ({
      ...current,
      screen,
      icon: option?.defaultIcon ?? current.icon,
      slug:
        slugTouched || !option?.defaultSlug
          ? current.slug
          : option.defaultSlug,
      name: current.name || (screen !== 'custom' ? option?.label ?? '' : ''),
    }))
  }

  function handleNameChange(name: string) {
    setValues((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }))
  }

  const isValid =
    values.name.trim().length > 1 && /^[a-z0-9-]+$/.test(values.slug)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValid || isSubmitting) return
    onSubmit({ ...values, name: values.name.trim() })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label>
        Screen
        <select
          value={values.screen}
          onChange={(event) =>
            handleScreenChange(event.target.value as HeadScreenKey)
          }
        >
          {SCREEN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Menu label
        <input
          required
          value={values.name}
          placeholder="e.g. Customer List"
          onChange={(event) => handleNameChange(event.target.value)}
        />
      </label>

      <label>
        Description
        <input
          value={values.description}
          placeholder="Shown under the page title"
          onChange={(event) => update('description', event.target.value)}
        />
      </label>

      <div className="form-row-2">
        <label>
          URL slug
          <input
            required
            value={values.slug}
            placeholder="customers"
            onChange={(event) => {
              setSlugTouched(true)
              update('slug', slugify(event.target.value))
            }}
          />
          <small className="field-hint">/head/{values.slug || '…'}</small>
        </label>

        <label>
          Icon
          <div className="icon-picker">
            <span className="icon-picker__preview">
              <Icon name={values.icon} size={16} />
            </span>
            <select
              value={values.icon}
              onChange={(event) =>
                update('icon', event.target.value as IconName)
              }
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <div className="form-row-2">
        <label>
          Role A
          <select
            value={values.roleAPermission}
            onChange={(event) =>
              update('roleAPermission', event.target.value as PermissionLevel)
            }
          >
            <option value="CAN_READ">Can Read</option>
            <option value="CAN_EDIT">Can Edit</option>
          </select>
        </label>

        <label>
          Role B
          <select
            value={values.roleBPermission}
            onChange={(event) =>
              update('roleBPermission', event.target.value as PermissionLevel)
            }
          >
            <option value="CAN_READ">Can Read</option>
            <option value="CAN_EDIT">Can Edit</option>
          </select>
        </label>
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={values.enabled}
          onChange={(event) => update('enabled', event.target.checked)}
        />
        Enabled (visible in head panel)
      </label>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : mode === 'create'
              ? 'Add feature'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
