module SettingsView exposing (..)

import Types exposing (..)
import Html.Events exposing (onClick)
import Html exposing (Html, button, div, text, p, iframe)
import Html.Attributes exposing (class)
import Json.Decode as Json exposing (Decoder, string, list)


-- todo: handle special case of ruby on rails


isInstalled : Model -> InternalLanguage -> (Maybe InstalledLanguage, String)
isInstalled m a =
    let
        ls =
            List.filter (\l -> l.name == a.name) <| Maybe.withDefault [] <| Maybe.map .installedLanguages m.settings
    in
        if List.isEmpty ls then
            (Nothing, "collection-item avatar")
        else
            (List.head ls, "collection-item avatar active")


getAction a isInstalled =
    case isInstalled of
        (Just installed, _) ->
            RemoveDocset installed

        _ ->
            Download a


sourceText a =
    case a.source of
        UserContributation ->
            "User Contribuation"

        Official ->
            "Official"

        _ ->
            "Custom"


availableLanguageView : Model -> InternalLanguage -> Html Msg
availableLanguageView m a =
    Html.li
        [ Html.Events.onClick (getAction a (isInstalled m a)), class <| Tuple.second <| isInstalled m a ]
        [ Html.div [ Html.Attributes.class "icon circle", Html.Attributes.style [ ( "background", "url(data:image/gif;base64," ++ a.icon2x ++ ")" ) ] ] []
        , Html.span [ Html.Attributes.class "title" ] [ text <| a.name ]
        , Html.span [ Html.Attributes.class "badge" ] [ text <| sourceText a ]
        , Html.p
            []
            ([ Html.b [] [ text <| "Current: " ++ a.version ]
             , Html.br [] []
             ]
                ++ text "Older versions:"
                :: List.map (\x -> text <| ", " ++ x) (Maybe.withDefault [] a.versions)
            )
        ]


spinner : Html.Html msg
spinner =
    div [ class "spinner" ]
        [ div [ class "double-bounce1" ]
            []
        , div [ class "double-bounce2" ]
            []
        ]


availableLanguagesView : Model -> Html Msg
availableLanguagesView model =
    if model.showSpinner then
        spinner
    else
        Html.div
            []
            [ Html.input
                [ Html.Attributes.placeholder "Search..."
                , Html.Events.on "input" (Json.map SearchAvailableLanguage Html.Events.targetValue)
                ]
                []
            , Html.ul
                [ class "collection availableLanguages" ]
                (List.map (availableLanguageView model) <| List.sortBy .name model.filteredAvailableLanguages)
            ]


settingsBar : Model -> Html Msg
settingsBar m =
    Html.ul
        [ class "side-nav fixed" ]
        [ Html.li [ class "active" ] [ text "Install Docs" ] ]


topBar : Model -> Html Msg
topBar model =
    div
        [ class "navbar-fixed" ]
        [ Html.nav
            [ class "top-nav fixed" ]
            [ div [ class "nav-wrapper" ]
                [ Html.ul
                    [ class "left" ]
                    [ Html.a [ Html.Events.onClick CloseSettings ] [ text "Close Settings" ] ]
                ]
            ]
        ]


feedsView : Model -> Html Msg
feedsView model =
    div [] [ button [ Html.Events.onClick ResetSettings ] [ Html.text "Reset Settings" ] ]


settingsView : Model -> Html Msg
settingsView model =
    div
        []
        [ Html.header
            []
            [ topBar model ]
        , Html.main_
            []
            [ div
                [ class "row" ]
                [ div
                    [ class "col s8" ]
                    [ feedsView model
                    , availableLanguagesView model
                    ]
                ]
            ]
        , Html.footer
            [ Html.Attributes.class "page-footer fixed-bottom" ]
            [ Html.text model.error ]
        ]
