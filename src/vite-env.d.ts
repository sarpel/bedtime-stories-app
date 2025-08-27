/// <reference types="vite/client" />

declare module '*.jsx' {
  import React = require('react');
  export default React.ComponentType<any>;
}

declare module '*.tsx' {
  import React = require('react');
  export default React.ComponentType<any>;
}
