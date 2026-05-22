import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <ScrollViewStyleReset />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3842509402331021"
          crossOrigin="anonymous"
        ></script>

        <style dangerouslySetInnerHTML={{ __html: `
          body {
            background-color: #f0f2f5;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
