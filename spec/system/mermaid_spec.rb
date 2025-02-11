# frozen_string_literal: true

describe "mermaid theme", type: :system do
  before { upload_theme_component }

  let(:mermaid_src) { <<~MERMAID }
    ```mermaid
      flowchart
        A --> B --> C
    ```
  MERMAID

  let(:post) { Fabricate(:post, raw: mermaid_src) }

  it "renders mermaid diagrams in posts" do
    visit "/t/#{post.topic.slug}/#{post.topic.id}"
    expect(page).to have_css "#post_1 .mermaid-wrapper .mermaid-diagram svg"

    find("#post_1 .mermaid-wrapper").hover
    find("#post_1 .mermaid-fullscreen-button").click
    expect(page).to have_css ".mermaid-fullscreen .mermaid-diagram svg"
  end

  it "renders mermaid diagrams in composer preview" do
    sign_in Fabricate(:admin)

    visit "/latest"
    find("#create-topic").click
    find(".d-editor-input").fill_in with: mermaid_src
  end
end
