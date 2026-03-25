# 🤝 Contributing to SmartChat X

Thank you for considering contributing to SmartChat X!

## Development Setup

1. Fork and clone the repository
2. Follow the [SETUP.md](./SETUP.md) guide
3. Create a feature branch: `git checkout -b feature/your-feature`

## Code Style

- **Python:** Follow PEP 8, use type hints
- **JavaScript/JSX:** Use ES6+, functional components, hooks
- **CSS:** Use Tailwind utilities, custom CSS in `/styles/`
- **Naming:** camelCase (JS), snake_case (Python), kebab-case (CSS files)

## Commit Messages

Use conventional commits:
```
feat: add protocol switching UI
fix: resolve WebSocket reconnection bug
docs: update API documentation
refactor: extract chat service
test: add message service tests
```

## Pull Request Process

1. Ensure code passes linting
2. Add tests for new features
3. Update documentation if needed
4. Request review from a maintainer

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.
