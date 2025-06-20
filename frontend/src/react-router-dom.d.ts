// TypeScript declarations for React Router future flags
import 'react-router-dom';

declare module 'react-router-dom' {
  interface CreateBrowserRouterOpts {
    future?: {
      v7_startTransition?: boolean;
      v7_relativeSplatPath?: boolean;
      v7_fetcherPersist?: boolean;
      v7_normalizeFormMethod?: boolean;
      v7_partialHydration?: boolean;
      v7_skipActionErrorRevalidation?: boolean;
    };
  }
  
  export function createBrowserRouter(
    routes: RouteObject[],
    opts?: CreateBrowserRouterOpts
  ): RemixRouter;
}
