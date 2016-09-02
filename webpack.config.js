const autoprefixer = require('autoprefixer')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ExtractTextWebpackPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const precss = require('precss')
const webpack = require('webpack')

const production = process.env.NODE_ENV === 'production'

// plugins for development builds only
const devPlugins = [
  new webpack.NoErrorsPlugin()
]

// http://webpack.github.io/docs/list-of-plugins.html
const plugins = [
  // remove build/client dir before compile time
  new CleanWebpackPlugin('build/client'),

  // extract path is relative to publicPath `build/client`
  new ExtractTextWebpackPlugin('public/css/app.css'),

  // copy over cache manifest
  new CopyWebpackPlugin([
    { from: 'node_modules/normalize.css/normalize.css', to: 'public/css' }
  ]),

  // optimize chunk occurences
  new webpack.optimize.OccurenceOrderPlugin(),

  // define env vars
  new webpack.DefinePlugin({
    'process.env': {
      BABEL_ENV: JSON.stringify(process.env.NODE_ENV),
      NODE_ENV: JSON.stringify(process.env.NODE_ENV)
    }
  }),

  // interpolate index.ejs
  new HtmlWebpackPlugin({
    title: 'Event Feed',
    template: 'src/client/index.ejs',
    inject: 'body',
    filename: 'index.html'
  })
]

// plugins for production builds only
const prodPlugins = [
  new webpack.optimize.DedupePlugin(),
  new webpack.optimize.MinChunkSizePlugin({ minChunkSize: 51200 }), // ~50kb
  new webpack.optimize.UglifyJsPlugin({
    mangle: true,
    compress: {
      // Suppress uglification warnings
      warnings: false
    }
  })
]

module.exports = {
  // inline-source-map makes devtools point to source files
  devtool: production ? false : 'inline-source-map',

  entry: './src/client/index.js',

  module: {
    // handle linting before compile step, fail faster
    preLoaders: [
      {
        exclude: /node_modules/,
        loader: 'standard',
        test: /\.js/
      }
    ],

    // set module loaders
    loaders: [
      // import es6 and convert to commonJS, also transpile React components
      // see .babelrc for config
      {
        exclude: /node_modules/,
        loader: 'babel',
        test: /\.js$/
      },

      // convert css and prefix, pass to styles loader to inject in page
      {
        // extract styles to file
        loader: ExtractTextWebpackPlugin.extract('style', 'css!postcss'),
        test: /\.css$/
      },

      // import images as compressed data URIs
      {
        loader: 'url!image-webpack',
        test: /\.(png|jpg|svg)$/
      },

      // support json
      {
        exclude: /node_modules/,
        loader: 'json',
        test: /\.json$/
      }
    ]
  },

  // where to output, also naming conventions
  output: {
    chunkFilename: '[name].js',
    filename: 'public/js/app.js',
    path: 'build/client'
  },

  // load plugins
  plugins: production ? plugins.concat(prodPlugins) : plugins.concat(devPlugins),

  // postcss loader plugins
  postcss () {
    return [autoprefixer, precss]
  }
}
