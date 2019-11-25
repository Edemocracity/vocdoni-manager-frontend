import { Component } from "react"
import { Button, Input, Form, Table, Select, InputNumber, message } from 'antd'
import { headerBackgroundColor } from "../lib/constants"
import { JsonFeed, JsonFeedPost, EntityMetadata, API, Network, MultiLanguage } from "dvote-js"
import { checkValidJsonFeed } from "dvote-js/dist/models/json-feed"
import { updateEntityValues } from "../util/dvote"
const { Buffer } = require("buffer/")
import EthereumManager from "../util/ethereum-manager"
// import { utils } from "ethers"

import { Layout } from 'antd'
import TextArea from "antd/lib/input/TextArea";
const { Header } = Layout

interface Props {
    refresh?: () => void,
    showList: () => void,
    feed: JsonFeed,
    entityDetails: EntityMetadata,
}

interface State {
    selectedPost: JsonFeedPost,
    feed: JsonFeed,
    entityDetails: EntityMetadata,
}

const fieldStyle = { marginTop: 8 }

const formItemLayout = {
    labelCol: {
        xs: { span: 24 },
        sm: { span: 5 },
    },
    wrapperCol: {
        xs: { span: 24 },
        sm: { span: 19 },
    },
}

export default class PageNewsFeedNew extends Component<Props, State> {
    state = {
        selectedPost: this.makeEmptyPost(),
        feed: this.props.feed,
        entityDetails: this.props.entityDetails,
    }

    addPostMetadata(post) {
        const now = new Date()
        post.id = String(Date.now())  // Timestamp
        post.date_published = now
        post.date_modified = now
        return post
    }

    submit = () => {
        // TODO: Make a singnature and use it for next transactions
        // EthereumManager.signer.signMessage("democracy")
        // .then(payload => {
        //     console.log(payload)
        //     let passphrase = prompt("Enter your passphrase to unlock your account")
        //     // console.log(passphrase)
        //     const digest  = utils.keccak256((Buffer.from(payload+passphrase, 'utf8').toString('hex')))
        //     console.log(digest)
        // })
        // const privKey = padding/trim(digest)
        // const data = encrypt("hello", privKey)


        const post = this.addPostMetadata(this.state.selectedPost)
        // console.log(JSON.stringify(this.state.selectedPost, null, 2))

        // TODO: Store POST in Dexie
        // el Dexie es un nice to have... con esto se puede montar una DB local, però también podríamos tirar de momento son
        // la única pega es que si se cierra el browser, se pierde todo

        // TODO:  Check Field are correct
        // let success = this.checkFields()
        // if (!success) return   

        // TODO:  Add new post in Items (state.feed.items)
        let feed = this.state.feed
        feed.items = [post].concat(feed.items)  // Add as the first item
        try {
            // TODO: The following removes the last post. Tested exactly the same in 
            // in Dvote-js and it works. How???
            // feed = checkValidJsonFeed(feed) 
            checkValidJsonFeed(feed)
        }
        catch (err) {
            message.warn("The updated News Feed does not seem to have a correct format")
            console.log(err)
            return
        }

        // TODO: Upload Entire feed like a string in IPFS
        const hideLoading = message.loading('Action in progress...', 0)
        Network.Bootnodes.getRandomGatewayInfo("goerli").then((gws) => {
            // TODO: Check why for some reason addFile doesn't work without Buffer
            return API.File.addFile(Buffer.from(JSON.stringify(feed)), `feed_${Date.now()}.json`, EthereumManager.signer, gws["goerli"])
        }).then(feedContentUri => {
            message.success("The news feed was pinned on IPFS successfully");
            // console.log(feedContentUri)

            // TODO: Update EntityMeta (Post in IPFS and in blockchain)
            let entityMetadata = this.props.entityDetails
            entityMetadata.newsFeed = { default: feedContentUri } as MultiLanguage<string>

            updateEntityValues(entityMetadata).then(() => {
                hideLoading()

                this.setState({ feed: feed })
                // message.success("The entity metadata ha been updated")
                message.success("The post has been successfully published")

                if (this.props.refresh) this.props.refresh()
            }).catch(err => {
                hideLoading()
                message.error("The entity metadata could not be updated")
            })
        }).catch(err => {
            hideLoading()
            console.error(`The new post could not be created: ${JSON.stringify(err)}`)
            message.error("The new post could not be created")
        })
    }

    setNestedKey = (obj, path: string[], value: any) => {
        if (path.length === 1) {
            obj[path[0]] = value
        }
        else {
            this.setNestedKey(obj[path[0]], path.slice(1), value)
        }
    }

    cloneselectedPost() {
        return Object.assign({}, this.state.selectedPost)
    }

    setselectedPostField(path: string[], value: any) {
        let post = this.cloneselectedPost()
        this.setNestedKey(post, path, value)
        this.setState({ selectedPost: post })
    }

    makeEmptyPost() {
        let post: JsonFeedPost = {
            id: "",
            title: "",
            summary: "",
            content_text: "",
            content_html: "",
            url: "",
            image: "",
            tags: [],
            date_published: "",
            date_modified: "",
            author: {
                name: "",
                url: "",
            }
        }
        return post
    }

    renderPostEditor() {
        const currentPost = this.state.selectedPost

        return <div style={{ padding: 30 }}>
            <h2>General</h2>
            <Form {...formItemLayout} onSubmit={e => { e.preventDefault() }}>
                <Form.Item label="Title">
                    <Input
                        style={fieldStyle}
                        size="large"
                        placeholder="Post Title"
                        value={currentPost.title}
                        onChange={ev => this.setselectedPostField(['title'], ev.target.value)}
                    />
                </Form.Item>
                <Form.Item label="Summary">
                    <TextArea
                        style={fieldStyle}
                        placeholder="A brief summary, containing the key purpose of the post described below."
                        autosize={{ minRows: 2, maxRows: 3 }}
                        value={currentPost.summary}
                        onChange={ev => this.setselectedPostField(["summary"], ev.target.value)}
                    />
                </Form.Item>
                <Form.Item label="Content (plain text)">
                    <TextArea
                        style={fieldStyle}
                        placeholder="Your text goes here"
                        autosize={{ minRows: 4, maxRows: 10 }}
                        value={currentPost.content_text}
                        onChange={ev => this.setselectedPostField(["content_text"], ev.target.value)}
                    />
                </Form.Item>
                <Form.Item label="Content (HTML)">
                    <TextArea
                        style={fieldStyle}
                        placeholder="<p>Your text goes here</p>"
                        autosize={{ minRows: 4, maxRows: 10 }}
                        value={currentPost.content_html}
                        onChange={ev => this.setselectedPostField(["content_html"], ev.target.value)}
                    />
                </Form.Item>
                <Form.Item label="Image Link">
                    <Input
                        style={fieldStyle}
                        placeholder="http://link.item/1234"
                        value={currentPost.image}
                        onChange={ev => this.setselectedPostField(["image"], ev.target.value)}
                    />
                </Form.Item>

                <Form.Item label="Tags">
                    <Input
                        style={fieldStyle}
                        placeholder="tag1;tag2;tag3"
                        value={currentPost.tags}
                        onChange={ev => this.setselectedPostField(["tags"], ev.target.value.toString().split(';'))}
                    />

                </Form.Item>
                <Form.Item label="Author">
                    <Input
                        style={fieldStyle}
                        placeholder="John Smith"
                        value={currentPost.author.name}
                        onChange={ev => this.setselectedPostField(["author", "name"], ev.target.value)}
                    />
                </Form.Item>
                <Form.Item label="Author (URL)">
                    <Input
                        style={fieldStyle}
                        placeholder="http://link.item/1234"
                        value={currentPost.author.url}
                        onChange={ev => this.setselectedPostField(["author", "url"], ev.target.value)}
                    />
                </Form.Item>
            </Form>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 24 }}>
                <Button
                    style={fieldStyle}
                    type="primary"
                    icon="rocket"
                    size={'large'}
                    onClick={this.submit}>
                    Submit Post</Button>
            </div>
        </div>
    }

    render() {
        return <>
            <Header style={{ backgroundColor: headerBackgroundColor }}>
                <div style={{ float: "right" }}>
                    <Button
                        type="default"
                        icon="unordered-list"
                        style={{ marginLeft: 8 }}
                        onClick={() => this.props.showList()}>Show post list</Button>
                </div>
                <h2>New Post</h2>
            </Header>

            <div style={{ padding: 24, background: '#fff' }}>
                {this.renderPostEditor()}
            </div>
        </>
    }
}
