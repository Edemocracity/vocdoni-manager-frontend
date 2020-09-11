import { useContext, Component } from 'react'
import Router from 'next/router'
import { Form, Input, Button, message, Modal, Row, Col, Card } from 'antd'
import { RcFile } from 'antd/lib/upload'
import Dragger from 'antd/lib/upload/Dragger'
import { API, EntityMetadata, GatewayBootNodes } from 'dvote-js'
import { getEntityId } from 'dvote-js/dist/api/entity'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons'

import { getGatewayClients, getNetworkState } from '../../lib/network'
import AppContext, { IAppContext } from '../../components/app-context'
import If from '../../components/if'


const AccountImportPage = props => {
    // Get the global context and pass it to our stateful component
    const context = useContext(AppContext)

    return <AccountImport {...context} />
}

type ImportFormProps = {
    values: {
        public: string,
        seed: string,
    },
}

const ImportFormFields = (props: ImportFormProps) => {
    const {values} = props
    const hasBackup: {public: boolean, seed: boolean} = {
        public: !!(values.public && values.public.length),
        seed: !!(values.seed && values.seed.length),
    }

    return <>
        <If condition={hasBackup.public}>
            Public key loaded <span className='text-truncate'>{values.public}</span>
        </If>
        <If condition={!hasBackup.public && !hasBackup.seed}>
            <p>Or manually set your details below:</p>
        </If>
        <If condition={hasBackup.public && hasBackup.seed}>
            <p>Now finish the process by setting an entity name and the expected password for the key pair.</p>
        </If>

        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Please input an account name!' }]}>
            <Input />
        </Form.Item>

        <If condition={!hasBackup.public}>
            <Form.Item label="Public key" name="public" rules={[{ required: true, message: 'Please input the public key!' }]}>
                <Input />
            </Form.Item>
        </If>

        <If condition={!hasBackup.seed}>
            <Form.Item label="Account seed" name="seed" rules={[{ required: true, message: 'Please input the seed!' }]}>
                <Input.Password />
            </Form.Item>
        </If>

        <Form.Item label="Password" name="passphrase" rules={[{ required: true, message: 'Please input the Password!' }]}>
            <Input.Password />
        </Form.Item>
    </>
}

class AccountImport extends Component<IAppContext> {
    state = {
        public: '',
        seed: '',
    }
    async componentDidMount() {
        // this.props.setTitle("Vocdoni")
        this.props.setMenuVisible(false)
    }

    async onFinish(values) {
        try {
            const vals = {...values, ...this.state}

            await this.props.web3Wallet.store(vals.name, vals.seed, vals.passphrase)
            await this.props.web3Wallet.load(vals.name, vals.passphrase)
            this.props.onNewWallet(this.props.web3Wallet.getWallet())
        } catch (e) {
            message.error('An error ocurred trying import the account. Please, try it again', 3)
            return false
        }

        const address = this.props.web3Wallet.getAddress()
        const entityId = getEntityId(address)

        const gateway = await getGatewayClients()
        let entity: EntityMetadata
        const self = this
        try {
            entity = await API.Entity.getEntityMetadata(entityId, gateway)
            Router.push("/entities/edit#/" + entityId)
        } catch (e) {
            Modal.confirm({
                title: "Entity not found",
                icon: <ExclamationCircleOutlined />,
                content: "It looks like your account is not linked to an existing entity. Do you want to create it now?",
                okText: "Create Entity",
                okType: "primary",
                cancelText: "Not now",
                onOk() {
                    Router.push("/entities/new")
                },
                onCancel() {
                    // Router.reload()
                    self.setState({ entityLoading: false })
                },
            })
        }
    }

    beforeUpload(file: RcFile) {
        const reader = new FileReader()
        reader.onload = (e) => {
            const contents = JSON.parse(Buffer.from(e.target.result).toString())
            this.setState(contents)
        }

        reader.readAsArrayBuffer(file)

        return false
    }

    render() {
        const layout = {
            labelCol: { span: 8 },
            wrapperCol: { span: 16 },
        }
        const tailLayout = {
            wrapperCol: { offset: 8, span: 10 },
        }

        return <div id="index">
            <Row justify="center" align="middle">
                <Col xs={24} sm={18} md={10}>
                    <Card title="Import and unlock an account" className="card">
                        <Form {...layout} onFinish={values => this.onFinish(values)}>
                            <If condition={!this.state.public.length || !this.state.seed.length}>
                                <Dragger
                                    beforeUpload={this.beforeUpload.bind(this)}
                                    accept={"application/json"}
                                    onRemove={console.log}
                                    multiple={false}
                                >
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                    </p>
                                    <p className="ant-upload-text">Click or drag your backup file here for easy import</p>
                                    <p className="ant-upload-hint">Only .json files are supported</p>
                                </Dragger>
                                <hr style={{margin: '20px 0'}} />
                            </If>
                            <ImportFormFields {...this.props} values={this.state} />

                            <Form.Item {...tailLayout}>
                                <Button type="primary" htmlType="submit">Import and log in</Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </div>
    }
}

export default AccountImportPage
