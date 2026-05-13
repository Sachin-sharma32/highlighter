declare module "*.css?inline" {
  const content: string;
  export default content;
}

declare module "virtual:click-to-component/client";
