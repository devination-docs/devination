module MainView exposing (..)

import Types exposing (..)
import Html.Events exposing (onClick)
import Html exposing (Html, button, div, text, p, iframe)
import Html.Attributes exposing (class)
import Json.Decode as Json exposing (Decoder, string, list, map2)
import String exposing (split)


isSelected : Model -> SearchIndex -> String
isSelected m s =
    case m.selectedDocPage of
        Just a ->
            if a == s.id then
                "active"
            else
                "not-active"

        Nothing ->
            ""


isLanguageSelected : Model -> InstalledLanguage -> String
isLanguageSelected m s =
    case m.language of
        Just a ->
            if a == s then
                "active"
            else
                "not-active"

        Nothing ->
            ""


nameView : Model -> SearchIndex -> Html Msg
nameView model searchIndex =
    Html.li
        [ class <| isSelected model searchIndex ]
        [ Html.a [ Html.Events.onClick (SetDocPage searchIndex.path searchIndex.id) ] [ text searchIndex.name ] ]


searchBar : Html Msg
searchBar =
    Html.li
        [ class "search" ]
        [ Html.input
            [ Html.Attributes.placeholder "Search..."
            , Html.Events.on "input" (Json.map Search Html.Events.targetValue)
            ]
            []
        ]


removeDocsetAppendix : String -> String
removeDocsetAppendix a =
    Maybe.withDefault "" <| List.head <| split "." a


functionsBar : Model -> Html Msg
functionsBar model =
    Html.ul
        [ class "side-nav fixed" ]
    <|
        searchBar
            :: (List.map (nameView model) model.cache)


installedLanguagesSelector : Model -> InstalledLanguage -> Html Msg
installedLanguagesSelector model language =
    Html.li 
        [ Html.Events.onClick (UpdateSelectedLanguage language), class "collection-item", class <| isLanguageSelected model language ]
        [ Html.div [ Html.Attributes.class "icon", Html.Attributes.style [ ( "background", "url(data:image/gif;base64," ++ language.icon2x ++ ")" ) ] ] []
        -- , Html.text <| removeDocsetAppendix language.name ]
        ]

chooseHeader : Html Msg
chooseHeader =
    Html.li [ class "collection-header" ] [ Html.a [ Html.Events.onClick OpenSettings ] [ Html.text "Click here to open settings and download a docset" ] ]


getBasePath m = 
    Maybe.withDefault "" <| Maybe.map .dataPath m.settings

docsView : Model -> List (Html Msg)
docsView model =
    case model.language of
        Just l ->
            [ Html.node "webview"
                [ Html.Attributes.src <| getBasePath model ++ "/docsets/" ++ l.fsName ++ "/Contents/Resources/Documents/" ++ model.docPage
                , Html.Attributes.attribute "autosize" "on"
                ]
                []
            ]

        Nothing ->
            [ Html.ul
                [ class "collection with-header" ]
                (chooseHeader :: (List.map (installedLanguagesSelector model) <| Maybe.withDefault [] <| Maybe.map .installedLanguages model.settings ))
            ]


docsViewer : Model -> Html Msg
docsViewer model =
    div
        [ class "col s12" ]
    <|
        docsView model


topBar : Model -> Html Msg
topBar model =
    div
        [ class "navbar-fixed" ]
        [ Html.nav
            [ class "top-nav fixed" ]
            [ div [ class "nav-wrapper" ]
                [ Html.ul
                    [ class "left" ]
                    [ Html.a [ Html.Events.onClick OpenSettings ] [ Html.text "Settings" ], Html.text model.error ]
                , Html.ul
                    [ class "right" ]
                    (List.map (installedLanguagesSelector model) <| Maybe.withDefault [] <| Maybe.map .installedLanguages model.settings)
                ]
            ]
        ]



mainView : Model -> Html Msg
mainView model =
    div
        []
        [ Html.header
            []
            [ topBar model
            , functionsBar model
            ]
        , Html.main_
            []
            [ div
                [ class "" ]
                [ div
                    [ class "row" ]
                    [ docsViewer model
                    ]
                ]
            ]
        ]
