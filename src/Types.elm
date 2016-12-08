module Types exposing (..)

import Http


type Msg
    = NoOp
    | UpdateResult (List SearchIndex)
    | SetDocPage String Id
    | Search String
    | DownloadResult InstalledLanguage
    | UpdateAvailableLanguages (List AvailableLanguage)
    | OpenSettings
    | Download InternalLanguage
    | CloseSettings
    | Spinner Bool
    | Init
    | FailRequest Http.Error
    | UpdateSelectedLanguage InstalledLanguage
    | SearchAvailableLanguage String
    | RemoveDocset InstalledLanguage
    | RemoveDocsetResult String
    | GetSettings String
    | SettingsResult Settings
    | ResetSettings

type alias Model =
    { cache : List SearchIndex
    , docPage : String
    , selectedDocPage : Maybe Id
    , language : Maybe InstalledLanguage
    , availableLanguages : List InternalLanguage
    , filteredAvailableLanguages : List InternalLanguage
    , isSettingsView : Bool
    , showSpinner : Bool
    , error : String
    , settings : Maybe Settings
    }


type alias Settings =
    { officialFeed : Feed
    , officialDownloadFeed : Feed
    , userFeed : Feed
    , installedLanguages : List InstalledLanguage
    , dataPath: String
    }


type alias Id =
    String


type alias Name =
    String


type alias Kind =
    String


type alias Path =
    String


type alias Language =
    String


type alias Feed =
    String


type alias InstalledLanguage =
    { name : String
    , logo : String
    , fsName : String
        -- , title : String
    , icon : String
    , icon2x : String
    }


type alias Versions =
    List String


type AvailableLanguage
    = UserLanguage UserAvailableLanguage
    | OfficialLanguage OfficialAvailableLanguage


type alias UserAvailableLanguage =
    ( String, OfficialAvailableLanguage )


type alias OfficialAvailableLanguage =
    { name : String
    , title : String
    , icon : String
    , icon2x : String
    , version : String
    , versions : Maybe Versions
    , archive : String
    }


type LanguageSource
    = Official
    | UserContributation
    | Custom String


type alias InternalLanguage =
    { name : String
    , title : String
    , key : String
    , source : LanguageSource
    , icon : String
    , icon2x : String
    , version : String
    , versions : Maybe Versions
    , archive : String
    }


asInternal : AvailableLanguage -> InternalLanguage
asInternal a =
    case a of
        UserLanguage ( n, l ) ->
            { name = l.name
            , title = l.title
            , icon = l.icon
            , icon2x = l.icon2x
            , version = l.version
            , key = n
            , source = UserContributation
            , versions = l.versions
            , archive = l.archive
            }

        OfficialLanguage l ->
            { name = l.name
            , title = l.title
            , icon = l.icon
            , icon2x = l.icon2x
            , version = Maybe.withDefault "" <| List.head <| Maybe.withDefault [] l.versions
            , key = l.name
            , source = Official
            , versions = l.versions
            , archive = ""
            }


asInternals : List AvailableLanguage -> List InternalLanguage
asInternals =
    List.map asInternal


type alias SearchIndex =
    { id : Id
    , name : Name
    , kind : Kind
    , path : Path
    }
