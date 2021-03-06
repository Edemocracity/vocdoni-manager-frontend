import { useContext, Component, createElement } from 'react'
import { message, Spin, Avatar, Modal, Divider, List } from 'antd'
import {
    LoadingOutlined,
    ExclamationCircleOutlined,
    EditOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons'
import { API, EntityMetadata, MultiLanguage } from 'dvote-js'
import Link from 'next/link'
import { getEntityId, updateEntity } from 'dvote-js/dist/api/entity'
import { fetchFileString } from 'dvote-js/dist/api/file'
import { checkValidJsonFeed } from 'dvote-js/dist/models/json-feed'
import { Wallet, Signer } from 'ethers'

import AppContext, { IAppContext } from '../../components/app-context'
import { getGatewayClients, getNetworkState } from '../../lib/network'
import { IFeedPost, INewsFeed } from '../../lib/types'
import Image from '../../components/image'
// import MainLayout from "../../components/layout"
// import { main } from "../i18n"
// import MultiLine from '../components/multi-line-text'
// import { } from '../lib/types'

const { Entity } = API
const PAGE_SIZE = 6

// MAIN COMPONENT
const PostViewPage = () => {
    // Get the global context and pass it to our stateful component
    const context = useContext(AppContext)

    return <PostView {...context} />
}

type State = {
    dataLoading?: boolean,
    entity?: EntityMetadata,
    entityId?: string,
    newsFeed?: INewsFeed,
    startIndex: number
}

// Stateful component
class PostView extends Component<IAppContext, State> {
    state: State = {
        startIndex: 0
    }

    async componentDidMount() {
        this.props.setMenuSelected("feed")
        await this.fecthMetadata()
    }

    async fecthMetadata() {
        try {
            const entityId = location.hash.substr(2)
            this.setState({ dataLoading: true, entityId })

            const gateway = await getGatewayClients()
            const entity = await Entity.getEntityMetadata(entityId, gateway)
            if (!entity) throw new Error()

            const newsFeedOrigin = entity.newsFeed.default
            const payload = await fetchFileString(newsFeedOrigin, gateway)

            let newsFeed
            try {
                newsFeed = JSON.parse(payload)
                checkValidJsonFeed(newsFeed)
                // newsFeed = checkValidJsonFeed(newsFeed)
            }
            catch (err) {
                message.warn("The current News Feed does not seem to have a correct format")
                console.log(err)
                throw new Error()
            }

            this.setState({ newsFeed, entity, entityId, dataLoading: false })
            this.props.setTitle(entity.name.default)
            this.props.setEntityId(entityId)
        }
        catch (err) {
            this.setState({ dataLoading: false })
            message.error("Could not read the entity metadata")
        }
    }

    shouldComponentUpdate() {
        const entityId = location.hash.substr(2)
        if (entityId !== this.state.entityId) {
            this.fecthMetadata()
        }
        return true
    }

    confirmDeletePost(index: number) {
        const that = this
        Modal.confirm({
            title: "Confirm",
            icon: <ExclamationCircleOutlined />,
            content: "The selected post will be no longer accessible and this action cannot be undone. Do you want to continue?",
            okText: "Delete Post",
            okType: "primary",
            cancelText: "Not now",
            onOk() {
                that.deletePost(index)
            },
        })
    }

    async deletePost(index: number) {
        const feed = JSON.parse(JSON.stringify(this.state.newsFeed))
        feed.items.splice(index, 1)

        const hideLoading = message.loading('Action in progress...', 0)

        try {
            const gateway = await getGatewayClients()
            getNetworkState()

            // TODO: Check why for some reason addFile doesn't work without Buffer
            const feedContent = Buffer.from(JSON.stringify(feed))
            const feedContentUri = await API.File.addFile(feedContent, `feed_${Date.now()}.json`, this.props.web3Wallet.getWallet() as (Wallet | Signer), gateway)

            // message.success("The news feed was pinned on IPFS successfully")

            const entityMetadata = this.state.entity
            entityMetadata.newsFeed = { default: feedContentUri } as MultiLanguage<string>

            const address = this.props.web3Wallet.getAddress()
            await updateEntity(address, entityMetadata, this.props.web3Wallet.getWallet() as (Wallet | Signer), gateway)
            hideLoading()

            message.success("The post has been deleted successfully")
            this.componentDidMount()
        }
        catch (err) {
            hideLoading()
            console.error("The post could not be deleted", err)
            message.error("The post could not be deleted")
        }
    }

    renderPostsList() {
        const entityId = location.hash.substr(2)
        const address = this.props.web3Wallet.getAddress()
        const { readOnly } = getNetworkState()
        let hideEditControls = readOnly || !address
        if (!hideEditControls) {
            const ownEntityId = getEntityId(address)
            hideEditControls = this.state.entityId !== ownEntityId
        }
        const that = this

        return <div className="body-card">
            <Divider orientation="left">News feed</Divider>

            <List
                itemLayout="vertical"
                size="large"
                pagination={{
                    onChange: page => {
                        this.setState({ startIndex: (page - 1) * PAGE_SIZE })
                        window.scrollTo({ top: 0 })
                    },
                    pageSize: PAGE_SIZE
                }}
                dataSource={(this.state.newsFeed && this.state.newsFeed.items || []) as any}
                renderItem={(post: IFeedPost, idx: number) => (
                    <List.Item
                        key={idx}
                        actions={PostListActions({
                            that,
                            hideEditControls,
                            entityId,
                            post,
                            idx,
                        })}
                    >
                        <List.Item.Meta
                            avatar={
                                <PostLink {...{
                                    hideEditControls,
                                    entityId,
                                    post,
                                }}>
                                    <Avatar
                                        icon={<Image src={post.image} />}
                                        shape='square'
                                        style={{cursor: 'pointer'}}
                                    />
                                </PostLink>
                            }
                            title={
                                <PostLink {...{
                                    hideEditControls,
                                    entityId,
                                    post,
                                }}>
                                    {post.title}
                                </PostLink>
                            }
                            description={post.date_published ? (new Date(post.date_published).toDateString()) + '\t' + (new Date(post.date_published).toLocaleTimeString()): ""}
                        />
                    </List.Item>
                )}
            />
        </div>
    }

    renderNotFound() {
        return <div className="not-found">
            <h4>Entity not found</h4>
            <p>The entity you are looking for cannot be found</p>
        </div>
    }

    renderLoading() {
        return <div>Loading the details of the entity...  <Spin indicator={<LoadingOutlined />} /></div>
    }

    render() {
        return <div id="post-view">
            {
                this.state.dataLoading ?
                    <div id="page-body" className="center">
                        {this.renderLoading()}
                    </div>
                    :
                    (this.state.entity && this.state.newsFeed) ?
                        <div id="page-body">
                            {this.renderPostsList()}
                        </div>
                        : <div id="page-body" className="center">
                            {this.renderNotFound()}
                        </div>
            }
        </div >
    }
}

const IconText = ({ icon, text, onClick }: { icon: any, text: string, onClick?: () => void }) => (
    <span className="icon-text" onClick={() => onClick && onClick()}>
        {createElement(icon, { style: { marginRight: 8 } })}
        {text}
    </span>
)

const PostLink = ({hideEditControls, post, entityId, children} : any) => {
    let link = `/posts/edit#/${entityId}/${post.id}`
    if (hideEditControls) {
        link = `/posts/view#/${entityId}/${post.id}`
    }

    return <Link href={link}>{children}</Link>
}

const PostListActions = (props: any) => {
    const {that, hideEditControls, entityId, post, idx} = props

    const actions = []
    if (!hideEditControls) {
        actions.push(
            <PostLink {...{
                hideEditControls,
                entityId,
                post,
            }}>
                <a><IconText icon={EditOutlined} text='Edit post' key='edit' /></a>
            </PostLink>
        )
        actions.push(
            <IconText
                icon={CloseCircleOutlined}
                text="Remove"
                onClick={ () => that.confirmDeletePost(that.state.startIndex + idx)
                } key="remove"
            />
        )
    }

    return actions
}

export default PostViewPage
