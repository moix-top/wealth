// Única vía de contacto visible de la app. Se pinta tanto en el login (sin
// sesión) como dentro de la aplicación, así que no lleva estado ni imports de
// servidor: sirve igual en un client component y en uno de servidor.
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Dudas, sugerencias, mejoras y contrataciones:{" "}
        <a href="mailto:radamuzc@gmail.com">radamuzc@gmail.com</a>
      </p>
    </footer>
  );
}
