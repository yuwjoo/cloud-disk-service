declare module 'tinytime' {
  type Options = { padMonth?: boolean };

  const tinytime = (string, options?: Options) => {
    return { render };
  };

  declare function render(d: Date): string;

  export default tinytime;
}
