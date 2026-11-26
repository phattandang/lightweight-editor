// pdfmake ships this Node-side font descriptor without typings (used by the PDF export test).
declare module "pdfmake/fonts/Roboto" {
  const fonts: Record<string, Record<string, string>>;
  export default fonts;
}
