import React from 'react';
import Document, { Head, Main, NextScript } from 'next/document';

import stylesheet from 'styles/index.scss';

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const props = await Document.getInitialProps(ctx);
    return { ...props };
  }
  render() {
    return (
      <html>
        <Head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <meta httpEquiv="x-ua-compatible" content="ie=edge" />
          <style dangerouslySetInnerHTML={{ __html: stylesheet }} />
          <title>Salut Simon!</title>
          <link rel="icon" type="image/png" href="favicon.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
