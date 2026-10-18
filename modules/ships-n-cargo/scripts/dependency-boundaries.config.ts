import type { DependencyBoundariesConfig } from './check-dependency-boundaries'

const config = {
  configFile: 'tsconfig.json',
  contextDiscovery: { kind: 'configured' },
  boundedContexts: [
    {
      name: 'ships-n-cargo',
      sourceRoot: 'src',
      boundaries: [
        { name: 'shared', path: 'shared', allowedDependencies: ['shared'] },
        { name: 'domain', path: 'domain', allowedDependencies: ['shared', 'domain'] },
        {
          name: 'application',
          path: 'application',
          allowedDependencies: ['shared', 'domain', 'application']
        },
        {
          name: 'adapters',
          path: 'adapters',
          allowedDependencies: ['shared', 'domain', 'application', 'adapters']
        },
        {
          name: 'bootstrap',
          path: 'bootstrap',
          allowedDependencies: ['shared', 'domain', 'application', 'adapters', 'bootstrap']
        }
      ]
    }
  ]
} satisfies DependencyBoundariesConfig

export default config
