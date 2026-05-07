/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(app)'}/account-detail` | `/account-detail`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/accounts` | `/accounts`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/budgets` | `/budgets`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/goals` | `/goals`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${'/(app)'}${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(app)'}${'/(tabs)'}/more` | `/more`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/notifications` | `/notifications`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/portfolio` | `/portfolio`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/recurring` | `/recurring`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/reports` | `/reports`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/search` | `/search`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/settings` | `/settings`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/simulators` | `/simulators`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/transactions` | `/transactions`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(auth)'}/register` | `/register`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(modals)'}/quick-add` | `/quick-add`;
            params?: Router.UnknownInputParams;
          };
      hrefOutputParams:
        | { pathname: Router.RelativePathString; params?: Router.UnknownOutputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownOutputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams }
        | {
            pathname: `${'/(app)'}/account-detail` | `/account-detail`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/accounts` | `/accounts`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/budgets` | `/budgets`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/goals` | `/goals`;
            params?: Router.UnknownOutputParams;
          }
        | { pathname: `${'/(app)'}${'/(tabs)'}` | `/`; params?: Router.UnknownOutputParams }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/more` | `/more`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/notifications` | `/notifications`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/portfolio` | `/portfolio`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/recurring` | `/recurring`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/reports` | `/reports`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/search` | `/search`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/settings` | `/settings`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/simulators` | `/simulators`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/transactions` | `/transactions`;
            params?: Router.UnknownOutputParams;
          }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownOutputParams }
        | { pathname: `${'/(auth)'}/register` | `/register`; params?: Router.UnknownOutputParams }
        | {
            pathname: `${'/(modals)'}/quick-add` | `/quick-add`;
            params?: Router.UnknownOutputParams;
          };
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/_sitemap${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}/account-detail${`?${string}` | `#${string}` | ''}`
        | `/account-detail${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/accounts${`?${string}` | `#${string}` | ''}`
        | `/accounts${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/budgets${`?${string}` | `#${string}` | ''}`
        | `/budgets${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/goals${`?${string}` | `#${string}` | ''}`
        | `/goals${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}${`?${string}` | `#${string}` | ''}`
        | `/${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/more${`?${string}` | `#${string}` | ''}`
        | `/more${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/notifications${`?${string}` | `#${string}` | ''}`
        | `/notifications${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/portfolio${`?${string}` | `#${string}` | ''}`
        | `/portfolio${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/recurring${`?${string}` | `#${string}` | ''}`
        | `/recurring${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/reports${`?${string}` | `#${string}` | ''}`
        | `/reports${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/search${`?${string}` | `#${string}` | ''}`
        | `/search${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/settings${`?${string}` | `#${string}` | ''}`
        | `/settings${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/simulators${`?${string}` | `#${string}` | ''}`
        | `/simulators${`?${string}` | `#${string}` | ''}`
        | `${'/(app)'}${'/(tabs)'}/transactions${`?${string}` | `#${string}` | ''}`
        | `/transactions${`?${string}` | `#${string}` | ''}`
        | `${'/(auth)'}/login${`?${string}` | `#${string}` | ''}`
        | `/login${`?${string}` | `#${string}` | ''}`
        | `${'/(auth)'}/register${`?${string}` | `#${string}` | ''}`
        | `/register${`?${string}` | `#${string}` | ''}`
        | `${'/(modals)'}/quick-add${`?${string}` | `#${string}` | ''}`
        | `/quick-add${`?${string}` | `#${string}` | ''}`
        | { pathname: Router.RelativePathString; params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(app)'}/account-detail` | `/account-detail`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/accounts` | `/accounts`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/budgets` | `/budgets`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/goals` | `/goals`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${'/(app)'}${'/(tabs)'}` | `/`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(app)'}${'/(tabs)'}/more` | `/more`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/notifications` | `/notifications`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/portfolio` | `/portfolio`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/recurring` | `/recurring`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/reports` | `/reports`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/search` | `/search`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/settings` | `/settings`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/simulators` | `/simulators`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${'/(app)'}${'/(tabs)'}/transactions` | `/transactions`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownInputParams }
        | { pathname: `${'/(auth)'}/register` | `/register`; params?: Router.UnknownInputParams }
        | {
            pathname: `${'/(modals)'}/quick-add` | `/quick-add`;
            params?: Router.UnknownInputParams;
          };
    }
  }
}
