import { EditOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Col, Row } from 'antd'
import QRCode from 'qrcode.react'
import React, { Component, ReactNode } from 'react'

import { main } from '../../i18n'
import AppContext from '../app-context'
import Copy from '../copy'
import If from '../if'
import Note from '../note'
import HeaderImage from './HeaderImage'

type ViewProps = {
    id: string,
    onEditClick: any,
}

export default class View extends Component<ViewProps, undefined> {
    static contextType = AppContext
    context!: React.ContextType<typeof AppContext>

    render() : ReactNode {
        const { id } = this.props
        const { entity } = this.context
        const link = `https://${process.env.APP_LINKING_DOMAIN}/entities/${id}`

        const columns = {
            left: {
                sm: 24,
                md: 8,
            },
            right: {
                sm: 24,
                md: 16,
            },
        }

        return (
            <>
                <HeaderImage
                    name={entity.name.default}
                    header={entity.media.header}
                    avatar={entity.media.avatar}
                />
                <Row justify='space-between'>
                    <Col>
                        <h1>{entity.name?.default}</h1>
                    </Col>
                    <If condition={!this.context.isReadOnlyNetwork}>
                        <Col>
                            <Button type='link' onClick={this.props.onEditClick}>
                                <EditOutlined /> Edit
                            </Button>
                        </Col>
                    </If>
                    <Col span={24}>
                        <div dangerouslySetInnerHTML={{
                            __html: entity.description?.default
                        }} />
                    </Col>
                    <Col span={24} className='entity-share'>
                        <h4><ShareAltOutlined /> Share</h4>
                        <Row>
                            <Col {...columns.left} className='qr'>
                                <div className='canvas-wrapper grayed rounded'>
                                    <a href={link} target='_blank' rel='noreferrer noopener nofollow'>
                                        <QRCode value={link} size={512} />
                                    </a>
                                </div>
                            </Col>
                            <Col {...columns.right} className='description'>
                                <Row justify='space-around' style={{height: '100%'}}>
                                    <Col span={24} className='copy-link'>
                                        <Copy text={link}>Copy link</Copy>
                                    </Col>
                                    <Col span={24} className='qr-note'>
                                        <Note>
                                            {main.qrNote}
                                        </Note>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </>
        )
    }
}
