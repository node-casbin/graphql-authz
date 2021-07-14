/**
 * Current role can not view the target resource.
 */
export class PermissionInsufficientError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

/**
 * There is no rule or directive for current endpoint.
 */
export class RuleNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

/**
 * Enforcer was not provided in the context with the CasbinContextEnforcerKey.
 */
export class EnforcerNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
