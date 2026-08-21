declare module "react-element-popper/animations/transition" {
  type PopperAnimation = (...args: unknown[]) => void;
  const transition: () => PopperAnimation;
  export default transition;
}

declare module "react-element-popper/animations/opacity" {
  type PopperAnimation = (...args: unknown[]) => void;
  const opacity: () => PopperAnimation;
  export default opacity;
}
