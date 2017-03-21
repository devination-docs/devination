{-# LANGUAGE DeriveGeneric     #-}
{-# LANGUAGE OverloadedStrings #-}


module Lib
    ( main
    ) where

import           Control.Applicative
import           Data.Aeson
import qualified Data.ByteString.Char8          as BS
-- Aeson's "encode" to json generates lazy bytestrings
import qualified Data.ByteString.Lazy.Char8     as BSL
import           Data.Semigroup                 ((<>))
import           Database.SQLite.Simple
import           Database.SQLite.Simple.FromRow
import           GHC.Generics
import           Options.Applicative
-- id * name * path
data DevinationRow = DevinationRow {
      devinationId   :: String
    , devinationName :: String
    , devinationPath :: String
  } deriving (Generic, Show)

data DevinationResult = DevinationResult {
      id       :: String
    , name     :: String
    , path     :: String
    , basePath :: String
  } deriving (Generic, Show)

instance ToJSON DevinationResult
instance FromJSON DevinationResult

instance FromRow DevinationRow where
  fromRow = DevinationRow <$> field <*> field <*> field


data DevinationConfig = DevinationConfig
  { devinationLanguage :: String
  , devinationQuery    :: String
  }

devinationConfig :: Parser DevinationConfig
devinationConfig = DevinationConfig
      <$> strOption
          ( long "language"
         <> short 'l'
         <> help "language to search" )
      <*> strOption
          ( long "query"
         <> short 'q'
         <> help "query a term" )


main :: IO ()
main = search =<< execParser opts
  where
    opts = info (devinationConfig <**> helper)
      ( fullDesc
     <> progDesc "devination cli"
     <> header "headless devination - cli usage" )


query1 = "SELECT cast(id as text) as id, name, path FROM searchIndex where name LIKE ? LIMIT 50"
-- todo: get this from devination config
basePathLiteral = "/home/joris/.config/devination/docsets/1ea8c700-0984-11e7-a027-992cbd37acc3/Haskell.docset/Contents/Resources/"

search :: DevinationConfig -> IO ()
search (DevinationConfig language devinationQuery) = do
  conn <- open "/home/joris/.config/devination/docsets/1ea8c700-0984-11e7-a027-992cbd37acc3/Haskell.docset/Contents/Resources/docSet.dsidx"
  r <- query conn query1 (Only (devinationQuery :: String)) :: IO [DevinationRow]
  Prelude.putStrLn $ BSL.unpack $ encode (fmap (\x -> DevinationResult (devinationId x) (devinationId x) (devinationPath x) basePathLiteral) r)
  close conn
search _ = return ()
