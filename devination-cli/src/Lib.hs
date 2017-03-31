{-# LANGUAGE DeriveGeneric     #-}
{-# LANGUAGE OverloadedStrings #-}


module Lib
    ( main
    ) where

import           Control.Applicative
import           Data.Aeson
import qualified Data.ByteString.Char8          as BS
-- Aeson's "encode" to json generates lazy bytestrings
import           Data.Aeson.TH
import qualified Data.ByteString.Lazy           as B
import qualified Data.ByteString.Lazy.Char8     as BSL
import           Data.Char                      (toLower, toUpper)
import qualified Data.List                      as List
import           Data.Semigroup                 ((<>))
import           Database.SQLite.Simple
import           Database.SQLite.Simple.FromRow
import           GHC.Generics
import           Options.Applicative
import           System.Directory               (getHomeDirectory)
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


data DevinationInstalled = DevinationInstalled
  { configName   :: String
  , configFsName :: String
  , configLogo   :: String
  } deriving (Generic, Show)

data DevinationConfig = DevinationConfig {
      officialFeed         :: String
    , officialDownloadFeed :: String
    , userFeed             :: String
    , installedLanguages   :: [DevinationInstalled]
  } deriving (Generic, Show)

instance ToJSON DevinationResult
instance FromJSON DevinationResult

instance FromJSON DevinationConfig

instance FromJSON DevinationInstalled where
  parseJSON = genericParseJSON (defaultOptions { fieldLabelModifier = config_noprefix })

config_noprefix "configName"     = "name"
config_noprefix "configFsName"   = "fsName"
config_noprefix "configLogo"     = "logo"
config_noprefix "configBasePath" = "basePath"
config_noprefix s                = s

instance FromRow DevinationRow where
  fromRow = DevinationRow <$> field <*> field <*> field


data CLIDevinationConfig = CLIDevinationConfig
  { devinationLanguage :: String
  , devinationQuery    :: String
  }

devinationConfig :: Parser CLIDevinationConfig
devinationConfig = CLIDevinationConfig
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

query1 = "SELECT cast(id as text) as id, name, path FROM searchIndex where name LIKE ? LIMIT 20"

basePathLiteral homePath = homePath ++ "/.config/devination/Settings"

devinationDocsetsPath homePath = homePath ++ "/.config/devination/docsets/"

jsonFile :: FilePath -> FilePath
jsonFile = basePathLiteral

deepPathExtension = "/Contents/Resources/"

getJSON :: FilePath -> IO B.ByteString
getJSON = B.readFile . jsonFile


search :: CLIDevinationConfig -> IO ()
search (CLIDevinationConfig language userQuery) = do
  homePath <- getHomeDirectory
  config <- (eitherDecode <$> getJSON homePath) :: IO (Either String DevinationConfig)
  case config of
    Left err ->
      putStrLn $ "while decoding devination config file " ++ (basePathLiteral homePath) ++ ": " ++ err
    Right dConfig ->
      case List.filter (\x -> (map toLower (configName x)) == (map toLower language)) $ installedLanguages dConfig of
        [selectedLanguage] -> do
          let deepPath =  (devinationDocsetsPath homePath) ++ (configFsName selectedLanguage) ++ deepPathExtension
          conn <- open $ deepPath ++ "docSet.dsidx"
          r <- query conn query1 (Only userQuery) :: IO [DevinationRow]
          Prelude.putStrLn $ BSL.unpack $ encode $ fmap (\x -> DevinationResult (devinationId x) (devinationName x) (devinationPath x) deepPath) r
          close conn
        -- todo: improve error message
        _ -> putStrLn "err language not found in config"
search _ = return ()
