import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { ROLE_OPTIONS } from "./roleMeta";
import type {
  DepartmentUserFormValues,
  DepartmentUserRole,
} from '../../../features/departments/head/types/head.types';

type UserFormMode = "create" | "edit";

interface UserFormModalProps {
  open: boolean;
  mode: UserFormMode;
  onClose: () => void;
  onSubmit: (values: DepartmentUserFormValues) => void;
  /** Pre-fill (edit mode, or defaults for create). */
  initialValues?: Partial<DepartmentUserFormValues>;
  isSubmitting?: boolean;
  error?: string;
  /** Override titles / labels if needed. */
  title?: string;
  submitLabel?: string;
  roleOptions?: { value: DepartmentUserRole; label: string }[];
}

const EMPTY: DepartmentUserFormValues = {
  name: "",
  phone: "",
  target: 100,
  email: "",
  role: "ONBOARDING_EXECUTIVE",
  temporaryPassword: "",
};

/**
 * Add / Edit department user form.
 *
 * - `create`: shows the temporary-password field,
 *   submit disabled until required fields are valid.
 * - `edit`: hides the password field, pre-fills from
 *   `initialValues`.
 */
export function UserFormModal({
  open,
  onClose,
  ...formProps
}: UserFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      className="modal user-form-modal"
    >
      {/* Mounted only while open → state resets on every open. */}
      <UserForm onClose={onClose} {...formProps} />
    </Modal>
  );
}

type UserFormProps = Omit<UserFormModalProps, "open">;

function UserForm({
  mode,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting = false,
  error,
  title,
  submitLabel = "Save user",
  roleOptions = ROLE_OPTIONS,
}: UserFormProps) {
  const [values, setValues] = useState<DepartmentUserFormValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }));

  function update<K extends keyof DepartmentUserFormValues>(
    key: K,
    value: DepartmentUserFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const phoneValid = /^\d{10}$/.test(values.phone);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);

  const isValid =
    values.name.trim().length > 1 &&
    phoneValid &&
    emailValid &&
    values.target > 0 &&
    (mode === "edit" || values.temporaryPassword.trim().length >= 4);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!isValid || isSubmitting) {
      return;
    }

    onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
    });
  }

  return (
    <form className="user-form" onSubmit={handleSubmit} noValidate>
      <h2 className="user-form__title">
        {title ?? (mode === "create" ? "Add user" : "Edit user")}
      </h2>

      <label className="user-form__field">
        Full name
        <input
          required
          value={values.name}
          placeholder="e.g. Riya Sharma"
          onChange={(event) => update("name", event.target.value)}
        />
      </label>

      <div className="user-form__row">
        <label className="user-form__field">
          Mobile number
          <input
            required
            inputMode="numeric"
            maxLength={10}
            value={values.phone}
            placeholder="10-digit number"
            onChange={(event) =>
              update("phone", event.target.value.replace(/\D/g, ""))
            }
          />
        </label>

        <label className="user-form__field">
          Monthly target
          <input
            required
            type="number"
            min={1}
            value={values.target}
            onChange={(event) => update("target", Number(event.target.value))}
          />
        </label>
      </div>

      <label className="user-form__field">
        Email
        <input
          required
          type="email"
          value={values.email}
          placeholder="name@gmail.com"
          onChange={(event) => update("email", event.target.value)}
        />
      </label>

      <label className="user-form__field">
        Role
        <select
          value={values.role}
          onChange={(event) =>
            update("role", event.target.value as DepartmentUserRole)
          }
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {mode === "create" ? (
        <label className="user-form__field">
          Temporary password
          <input
            required
            type="text"
            autoComplete="off"
            value={values.temporaryPassword}
            placeholder="User changes it on first login"
            onChange={(event) =>
              update("temporaryPassword", event.target.value)
            }
          />
        </label>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>

        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
